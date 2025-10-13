import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth';
import { strictLimiter, apiLimiter } from '../middleware/rateLimiter';
import { validate, schemas } from '../middleware/validation';
import { UserRole } from '../types';
import * as reportController from '../controllers/reportController';

const router = Router();

/**
 * @route   POST /api/report
 * @desc    Create a report
 * @access  Public (optional auth)
 */
router.post(
  '/',
  optionalAuth,
  strictLimiter,
  validate(schemas.createReport),
  asyncHandler(reportController.createReport)
);

/**
 * @route   GET /api/report
 * @desc    Get reports
 * @access  Private (moderator/admin only)
 */
router.get(
  '/',
  authenticate,
  requireRole(UserRole.MODERATOR, UserRole.ADMIN),
  apiLimiter,
  asyncHandler(reportController.getReports)
);

export default router;