import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as webhookController from '../controllers/webhookController';

const router = Router();

/**
 * @route   POST /api/webhook/stream
 * @desc    Handle Stream webhook events
 * @access  Public (signature verified)
 */
router.post(
  '/stream',
  asyncHandler(webhookController.handleStreamWebhook)
);

export default router;