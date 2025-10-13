import { Response } from 'express';
import { AuthenticatedRequest, ReportTargetType, ReportStatus } from '../types';
import { Report } from '../models/Report';
import { ModerationQueue } from '../models/ModerationQueue';
import { AuditLog } from '../models/AuditLog';
import { streamClient } from '../services/streamClient';
import { pushService } from '../services/pushService';
import { logger } from '../utils/logger';

/**
 * Create a report
 */
export const createReport = async (req: AuthenticatedRequest, res: Response) => {
  const { targetType, targetId, reason } = req.body;
  const reporterUserId = req.user?.id; // Optional for anonymous reports

  // Create report
  const report = await Report.create({
    reporterUserId: reporterUserId || undefined,
    targetType,
    targetId,
    reason,
    status: ReportStatus.OPEN,
  });

  // If targeting a message, create moderation queue entry
  if (targetType === ReportTargetType.MESSAGE) {
    await ModerationQueue.create({
      payload: {
        reportId: report._id,
        messageId: targetId,
        reason,
        reportedBy: reporterUserId,
      },
      reasonTags: ['reported'],
      severity: 1, // Medium severity for manual reports
      processed: false,
    });

    // Flag message in Stream
    try {
      if (reporterUserId) {
        await streamClient.flagMessage(targetId, reporterUserId, reason);
      }
    } catch (error) {
      logger.error('Failed to flag message in Stream:', error);
      // Continue anyway
    }
  }

  // Notify moderators
  try {
    await pushService.notifyModerators('New report submitted', {
      reportId: report._id,
      targetType,
      targetId,
    });
  } catch (error) {
    logger.error('Failed to notify moderators:', error);
  }

  // Log audit
  await AuditLog.create({
    action: 'report_created',
    actorUserId: reporterUserId,
    target: `${targetType}:${targetId}`,
    timestamp: new Date(),
    meta: {
      reportId: report._id,
      reason,
    },
  });

  logger.info(`Report created: ${report._id} for ${targetType}:${targetId}`);

  res.status(201).json({
    success: true,
    data: {
      reportId: report._id,
      status: report.status,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Get reports (admin/moderator only)
 */
export const getReports = async (req: AuthenticatedRequest, res: Response) => {
  const { page = 1, limit = 20, status, targetType } = req.query;

  const query: any = {};
  if (status) query.status = status;
  if (targetType) query.targetType = targetType;

  const skip = (Number(page) - 1) * Number(limit);

  const [reports, total] = await Promise.all([
    Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('reporterUserId', 'displayName email')
      .populate('moderatorId', 'displayName email'),
    Report.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasNext: skip + reports.length < total,
        hasPrev: Number(page) > 1,
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};