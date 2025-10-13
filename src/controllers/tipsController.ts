import { Response } from 'express';
import { AuthenticatedRequest, TipType } from '../types';
import { DailyTip } from '../models/DailyTip';
import { AuditLog } from '../models/AuditLog';
import { pushService } from '../services/pushService';
import { streamClient } from '../services/streamClient';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

// Sample tips for random selection
const SAMPLE_TIPS = [
  { content: "Take 5 deep breaths. Inhale peace, exhale stress.", type: TipType.TEXT },
  { content: "Reach out to a friend today. Connection heals.", type: TipType.TEXT },
  { content: "Write down 3 things you're grateful for.", type: TipType.ACTIVITY },
  { content: "Take a 10-minute walk outside. Nature refreshes the mind.", type: TipType.ACTIVITY },
  { content: "Remember: It's okay to not be okay. You are not alone.", type: TipType.TEXT },
];

/**
 * Publish daily tip
 */
export const publishDailyTip = async (req: AuthenticatedRequest, res: Response) => {
  // Verify authorization (static secret or admin JWT)
  const authHeader = req.headers.authorization;
  const publishSecret = config.publish.secret;

  let authorized = false;
  let publishedBy = 'system';

  // Check if admin user
  if (req.user && req.user.role === 'admin') {
    authorized = true;
    publishedBy = req.user.id;
  }
  // Check static secret
  else if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === publishSecret) {
      authorized = true;
      publishedBy = 'scheduled-job';
    }
  }

  if (!authorized) {
    throw new AppError('Unauthorized to publish tips', 403, 'FORBIDDEN');
  }

  const { content, type, scheduledFor } = req.body;

  // Generate tip ID (YYYYMMDD format)
  const tipDate = scheduledFor ? new Date(scheduledFor) : new Date();
  const tipId = tipDate.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD

  // Check if tip already exists for today
  const existingTip = await DailyTip.findOne({ id: tipId });
  if (existingTip) {
    throw new AppError('Tip already published for this date', 409, 'TIP_EXISTS', {
      tipId,
      existingTip,
    });
  }

  // Select or use provided content
  let tipContent = content;
  let tipType = type || TipType.TEXT;

  if (!tipContent) {
    // Pick random tip
    const randomTip = SAMPLE_TIPS[Math.floor(Math.random() * SAMPLE_TIPS.length)];
    tipContent = randomTip.content;
    tipType = randomTip.type;
  }

  // Create daily tip
  const dailyTip = await DailyTip.create({
    id: tipId,
    content: tipContent,
    type: tipType,
    publishedAt: new Date(),
    publishedBy,
  });

  // Send push notification
  try {
    await pushService.sendDailyTipNotification(tipContent);
  } catch (error) {
    logger.error('Failed to send tip notification:', error);
  }

  // Post to global tips channel (if exists)
  try {
    await streamClient.sendSystemMessage('messaging', 'daily-tips', `🌟 Daily Tip: ${tipContent}`);
  } catch (error) {
    logger.error('Failed to post tip to Stream channel:', error);
  }

  // Create audit log
  await AuditLog.create({
    action: 'daily_tip_published',
    actorUserId: req.user?.id,
    target: tipId,
    timestamp: new Date(),
    meta: {
      content: tipContent,
      type: tipType,
      publishedBy,
    },
  });

  logger.info(`Daily tip published: ${tipId}`);

  res.status(200).json({
    success: true,
    data: {
      tip: dailyTip,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Get daily tips
 */
export const getDailyTips = async (req: AuthenticatedRequest, res: Response) => {
  const { page = 1, limit = 30 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const [tips, total] = await Promise.all([
    DailyTip.find()
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    DailyTip.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: tips,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasNext: skip + tips.length < total,
        hasPrev: Number(page) > 1,
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};