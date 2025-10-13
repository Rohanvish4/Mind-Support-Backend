import { Response } from 'express';
import { AuthenticatedRequest, ModerationAction, ReportStatus } from '../types';
import { Report } from '../models/Report';
import { ModerationQueue } from '../models/ModerationQueue';
import { User } from '../models/User';
import { ChatRoom } from '../models/ChatRoom';
import { AuditLog } from '../models/AuditLog';
import { streamClient } from '../services/streamClient';
// ...existing code...
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

/**
 * Resolve a moderation action
 */
export const resolveModerationAction = async (req: AuthenticatedRequest, res: Response) => {
  const moderatorId = req.user!.id;
  const { reportId, action, comment, banDurationHours } = req.body;

  // Fetch report
  const report = await Report.findById(reportId);
  if (!report) {
    throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
  }

  if (report.status === ReportStatus.RESOLVED) {
    throw new AppError('Report already resolved', 400, 'ALREADY_RESOLVED');
  }

  let actionDetails: any = {
    action,
    comment,
  };

  // Execute moderation action
  switch (action) {
    case ModerationAction.DISMISS:
      // Just mark as resolved
      break;

    case ModerationAction.REMOVE:
      // Remove message/content
      if (report.targetType === 'message') {
        try {
          await streamClient.deleteMessage(report.targetId, true);
          actionDetails.messageDeleted = true;
        } catch (error) {
          logger.error('Failed to delete message:', error);
          actionDetails.messageDeleted = false;
        }
      }
      break;

    case ModerationAction.BAN_USER:
      // Ban the user
      if (report.targetType === 'message' || report.targetType === 'user') {
        let targetUserId = report.targetId;
        
        // If message, we need to find the user who sent it
        // For this example, assume targetId is userId for 'user' type
        if (report.targetType === 'message') {
          // In production, fetch message details from Stream or database
          logger.warn('Message author lookup needed for ban action');
        }

        const user = await User.findById(targetUserId);
        if (user) {
          // Calculate ban expiry
          const bannedUntil = new Date();
          if (banDurationHours) {
            bannedUntil.setHours(bannedUntil.getHours() + banDurationHours);
          } else {
            bannedUntil.setFullYear(bannedUntil.getFullYear() + 10); // Permanent
          }

          user.bannedUntil = bannedUntil;
          await user.save();

          // Ban in Stream
          try {
            await streamClient.banUser(targetUserId, {
              timeout: banDurationHours ? banDurationHours * 60 : undefined,
              reason: comment || 'Moderation action',
              bannedBy: moderatorId,
            });
            actionDetails.streamBanned = true;
          } catch (error) {
            logger.error('Failed to ban user in Stream:', error);
            actionDetails.streamBanned = false;
          }

          actionDetails.bannedUntil = bannedUntil;
        }
      }
      break;

    case ModerationAction.SUSPEND_CHANNEL:
      // Suspend/delete channel
      if (report.targetType === 'channel') {
        const chatRoom = await ChatRoom.findOne({ streamChannelId: report.targetId });
        if (chatRoom) {
          chatRoom.flaggedCount += 100; // Mark as suspended
          await chatRoom.save();
          actionDetails.channelSuspended = true;
        }
      }
      break;

    default:
      throw new AppError('Invalid moderation action', 400, 'INVALID_ACTION');
  }

  // Update report
  report.status = ReportStatus.RESOLVED;
  report.moderatorId = moderatorId as any;
  report.moderatorComment = comment;
  report.resolvedAt = new Date();
  await report.save();

  // Create audit log
  await AuditLog.create({
    action: 'moderation_resolved',
    actorUserId: moderatorId,
    target: `${report.targetType}:${report.targetId}`,
    timestamp: new Date(),
    meta: {
      reportId: report._id,
      action,
      details: actionDetails,
    },
  });

  logger.info(`Moderation action resolved: ${reportId} by moderator ${moderatorId}`);

  res.status(200).json({
    success: true,
    data: {
      reportId: report._id,
      action,
      status: report.status,
      details: actionDetails,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Get moderation queue
 */
export const getModerationQueue = async (req: AuthenticatedRequest, res: Response) => {
  const { page = 1, limit = 20, processed = 'false' } = req.query;

  const query: any = {
    processed: processed === 'true',
  };

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    ModerationQueue.find(query)
      .sort({ severity: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    ModerationQueue.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasNext: skip + items.length < total,
        hasPrev: Number(page) > 1,
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Process a queue item
 */
export const processQueueItem = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const moderatorId = req.user!.id;

  const queueItem = await ModerationQueue.findById(id);
  if (!queueItem) {
    throw new AppError('Queue item not found', 404, 'QUEUE_ITEM_NOT_FOUND');
  }

  if (queueItem.processed) {
    throw new AppError('Queue item already processed', 400, 'ALREADY_PROCESSED');
  }

  // Mark as processed
  queueItem.processed = true;
  queueItem.processedAt = new Date();
  await queueItem.save();

  // Create audit log
  await AuditLog.create({
    action: 'queue_item_processed',
    actorUserId: moderatorId,
  target: String(queueItem._id),
    timestamp: new Date(),
    meta: {
      severity: queueItem.severity,
      reasonTags: queueItem.reasonTags,
    },
  });

  logger.info(`Queue item processed: ${id} by moderator ${moderatorId}`);

  res.status(200).json({
    success: true,
    data: {
      queueItemId: queueItem._id,
      processed: true,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};