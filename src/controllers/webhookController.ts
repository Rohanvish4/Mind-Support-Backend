import { Request, Response } from 'express';
import { StreamWebhookEvent, KeywordSeverity } from '../types';
import { streamClient } from '../services/streamClient';
import { keywordScanner } from '../services/keywordScanner';
import { idempotencyService } from '../services/idempotency';
import { pushService } from '../services/pushService';
import { ChatRoom } from '../models/ChatRoom';
import { ModerationQueue } from '../models/ModerationQueue';
import { Report } from '../models/Report';
import { MetricsMessagesDaily } from '../models/MetricsMessagesDaily';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

// Crisis resources for high-severity messages
const CRISIS_RESOURCES = [
  {
    name: 'National Suicide Prevention Lifeline',
    phone: '988',
    url: 'https://988lifeline.org',
    description: '24/7 free and confidential support',
    availability: '24/7',
  },
  {
    name: 'Crisis Text Line',
    phone: 'Text HOME to 741741',
    url: 'https://www.crisistextline.org',
    description: 'Free 24/7 support via text',
    availability: '24/7',
  },
];

/**
 * Handle Stream webhook events
 */
export const handleStreamWebhook = async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    if (!signature) {
      throw new AppError('Missing webhook signature', 401, 'MISSING_SIGNATURE');
    }

    const isValid = streamClient.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new AppError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
    }

    const event: StreamWebhookEvent = req.body;

    // Process based on event type
    if (event.type === 'message.new' && event.message) {
      await processMessageCreated(event);
    }

    // Respond quickly (webhook should return within 3 seconds)
    return res.status(200).json({ success: true });
  } catch (error: any) {
    logger.error('Webhook processing error:', error);
    
    // Still return 200 to avoid retries for validation errors
    if (error.code === 'INVALID_SIGNATURE' || error.code === 'MISSING_SIGNATURE') {
      return res.status(401).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: false });
  }
};

/**
 * Process message.created event
 */
async function processMessageCreated(event: StreamWebhookEvent) {
  const message = event.message!;
  const messageId = message.id;
  const text = message.text;
  const userId = message.user.id;
  const channelId = message.cid;

  logger.info(`Processing message: ${messageId} in channel ${channelId}`);

  // Check idempotency
  const alreadyProcessed = await idempotencyService.isProcessed(messageId);
  if (alreadyProcessed) {
    logger.info(`Message already processed: ${messageId}`);
    return;
  }

  // Mark as processed immediately to prevent race conditions
  await idempotencyService.markProcessed(messageId);

  // Scan message text
  const scanResult = await keywordScanner.scanText(text);

  logger.info(`Message scan result: severity=${scanResult.severity}, matches=${scanResult.matches.length}`);

  // Handle based on severity
  if (scanResult.severity === KeywordSeverity.HIGH) {
    await handleHighSeverity(messageId, userId, channelId, scanResult, text);
  } else if (scanResult.severity === KeywordSeverity.MEDIUM) {
    await handleMediumSeverity(messageId, userId, channelId, scanResult, text);
  } else if (scanResult.severity === KeywordSeverity.LOW) {
    await handleLowSeverity(messageId, userId, channelId, scanResult, text);
  }

  // Update metrics and chat room
  await updateMetricsAndChatRoom(channelId);

  logger.info(`Message processing completed: ${messageId}`);
}

/**
 * Handle high severity message
 */
async function handleHighSeverity(
  messageId: string,
  userId: string,
  channelId: string,
  scanResult: any,
  text: string
) {
  logger.warn(`HIGH severity message detected: ${messageId}`);

  // Create moderation queue entry
  await ModerationQueue.create({
    payload: {
      messageId,
      userId,
      channelId,
      text,
      matches: scanResult.matches,
    },
    reasonTags: scanResult.matches.map((m: any) => m.word),
    severity: 3,
    processed: false,
  });

  // Create automatic report
  await Report.create({
    targetType: 'message',
    targetId: messageId,
    reason: `Automatic: High severity keywords detected - ${scanResult.matches.map((m: any) => m.word).join(', ')}`,
    status: 'under_review',
  });

  // Delete message immediately
  try {
    await streamClient.deleteMessage(messageId, true);
    logger.info(`Message deleted: ${messageId}`);
  } catch (error) {
    logger.error('Failed to delete message:', error);
  }

  // Notify moderators
  try {
    await pushService.notifyModerators('HIGH severity message detected', {
      messageId,
      userId,
      channelId,
      severity: 'high',
    });
  } catch (error) {
    logger.error('Failed to notify moderators:', error);
  }

  // Send crisis resources to author
  try {
    await pushService.sendCrisisResources(userId, CRISIS_RESOURCES);
  } catch (error) {
    logger.error('Failed to send crisis resources:', error);
  }

  // Update chat room flagged count
  await ChatRoom.updateOne(
    { streamChannelId: channelId },
    { $inc: { flaggedCount: 1 } }
  );

  // Create audit log
  await AuditLog.create({
    action: 'message_moderated_high',
    target: messageId,
    timestamp: new Date(),
    meta: {
      userId,
      channelId,
      severity: 'high',
      matches: scanResult.matches,
      automated: true,
    },
  });
}

/**
 * Handle medium severity message
 */
async function handleMediumSeverity(
  messageId: string,
  userId: string,
  channelId: string,
  scanResult: any,
  text: string
) {
  logger.warn(`MEDIUM severity message detected: ${messageId}`);

  // Create moderation queue entry
  await ModerationQueue.create({
    payload: {
      messageId,
      userId,
      channelId,
      text,
      matches: scanResult.matches,
    },
    reasonTags: scanResult.matches.map((m: any) => m.word),
    severity: 2,
    processed: false,
  });

  // Flag message in Stream
  try {
    await streamClient.flagMessage(messageId, 'system', 'Medium severity keywords detected');
    logger.info(`Message flagged: ${messageId}`);
  } catch (error) {
    logger.error('Failed to flag message:', error);
  }

  // Update chat room flagged count
  await ChatRoom.updateOne(
    { streamChannelId: channelId },
    { $inc: { flaggedCount: 1 } }
  );

  // Create audit log
  await AuditLog.create({
    action: 'message_flagged_medium',
    target: messageId,
    timestamp: new Date(),
    meta: {
      userId,
      channelId,
      severity: 'medium',
      matches: scanResult.matches,
      automated: true,
    },
  });
}

/**
 * Handle low severity message
 */
async function handleLowSeverity(
  messageId: string,
  userId: string,
  channelId: string,
  scanResult: any,
  text: string
) {
  logger.info(`LOW severity message detected: ${messageId}`);

  // Optional: Create queue entry for review
  await ModerationQueue.create({
    payload: {
      messageId,
      userId,
      channelId,
      text,
      matches: scanResult.matches,
    },
    reasonTags: scanResult.matches.map((m: any) => m.word),
    severity: 1,
    processed: false,
  });
}

/**
 * Update metrics and chat room
 */
async function updateMetricsAndChatRoom(channelId: string) {
  // Update chat room last message time
  await ChatRoom.updateOne(
    { streamChannelId: channelId },
    { lastMessageAt: new Date() }
  );

  // Update daily metrics
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  await MetricsMessagesDaily.updateOne(
    { day: today },
    { $inc: { count: 1 } },
    { upsert: true }
  );
}