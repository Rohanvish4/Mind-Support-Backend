import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { optionalAuth } from '../middleware/auth';
import { strictLimiter, apiLimiter } from '../middleware/rateLimiter';
import { validate, schemas } from '../middleware/validation';
// ...existing code...
import * as tipsController from '../controllers/tipsController';

const router = Router();

/**
 * @route   POST /api/tips/publish
 * @desc    Publish daily tip
 * @access  Private (admin only or scheduled job with secret)
 */
router.post(
  '/publish',
  optionalAuth,
  strictLimiter,
  validate(schemas.publishTip),
  asyncHandler(tipsController.publishDailyTip)
);

/**
 * @route   GET /api/tips
 * @desc    Get daily tips
 * @access  Public
 */
router.get(
  '/',
  apiLimiter,
  asyncHandler(tipsController.getDailyTips)
);

export default router;