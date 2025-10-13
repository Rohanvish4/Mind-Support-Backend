import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import { validate, schemas } from '../middleware/validation';
import { UserRole } from '../types';
import * as moderationController from '../controllers/moderationController';

const router = Router();

/**
 * @route   POST /api/moderation/resolve
 * @desc    Resolve a moderation action
 * @access  Private (moderator/admin only)
 */
router.post(
  '/resolve',
  authenticate,
  requireRole(UserRole.MODERATOR, UserRole.ADMIN),
  apiLimiter,
  validate(schemas.resolveModeration),
  asyncHandler(moderationController.resolveModerationAction)
);

/**
 * @route   GET /api/moderation/queue
 * @desc    Get moderation queue
 * @access  Private (moderator/admin only)
 */
router.get(
  '/queue',
  authenticate,
  requireRole(UserRole.MODERATOR, UserRole.ADMIN),
  apiLimiter,
  asyncHandler(moderationController.getModerationQueue)
);

/**
 * @route   POST /api/moderation/queue/:id/process
 * @desc    Process a queue item
 * @access  Private (moderator/admin only)
 */
router.post(
  '/queue/:id/process',
  authenticate,
  requireRole(UserRole.MODERATOR, UserRole.ADMIN),
  apiLimiter,
  asyncHandler(moderationController.processQueueItem)
);

export default router;