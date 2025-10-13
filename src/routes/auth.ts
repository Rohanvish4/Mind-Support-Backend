import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authLimiter } from '../middleware/rateLimiter';
import { validate, schemas } from '../middleware/validation';
import * as authController from '../controllers/authController';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  validate(schemas.register),
  asyncHandler(authController.register)
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  validate(schemas.login),
  asyncHandler(authController.login)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  authLimiter,
  validate(schemas.refresh),
  asyncHandler(authController.refresh)
);

export default router;