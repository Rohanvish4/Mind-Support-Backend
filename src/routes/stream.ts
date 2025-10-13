import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import { validate, schemas } from '../middleware/validation';
import * as streamController from '../controllers/streamController';

const router = Router();

/**
 * @route   POST /api/stream/token
 * @desc    Get Stream token for authenticated user
 * @access  Private
 */
router.post(
  '/token',
  authenticate,
  apiLimiter,
  validate(schemas.streamToken),
  asyncHandler(streamController.getStreamToken)
);

/**
 * @route   POST /api/stream/createChannel
 * @desc    Create a new Stream channel
 * @access  Private
 */
router.post(
  '/createChannel',
  authenticate,
  apiLimiter,
  validate(schemas.createChannel),
  asyncHandler(streamController.createChannel)
);

/**
 * @route   POST /api/stream/joinChannel
 * @desc    Join an existing channel
 * @access  Private
 */
router.post(
  '/joinChannel',
  authenticate,
  apiLimiter,
  validate(schemas.joinChannel),
  asyncHandler(streamController.joinChannel)
);

export default router;