import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { User } from '../models/User';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

/**
 * Register a new user
 */
export const register = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, displayName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User already exists', 409, 'USER_EXISTS');
  }

  // Hash password
  const passwordHash = await authService.hashPassword(password);

  // Create user
  const user = await User.create({
    email,
    passwordHash,
    displayName,
  });

  // Generate tokens
  const accessToken = authService.generateAccessToken({
    userId: String(user._id),
    role: user.role,
    email: user.email,
  });

  const refreshToken = authService.generateRefreshToken({
    userId: String(user._id),
    role: user.role,
    email: user.email,
  });

  logger.info(`User registered: ${user._id}`);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Login user
 */
export const login = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email });
  if (!user || !user.passwordHash) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Check if banned
  if (user.isBanned()) {
    throw new AppError('User is banned', 403, 'USER_BANNED', {
      bannedUntil: user.bannedUntil,
    });
  }

  // Verify password
  const isValid = await authService.comparePassword(password, user.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Generate tokens
  const accessToken = authService.generateAccessToken({
    userId: String(user._id),
    role: user.role,
    email: user.email,
  });

  const refreshToken = authService.generateRefreshToken({
    userId: String(user._id),
    role: user.role,
    email: user.email,
  });

  // Update last seen
  user.lastSeenAt = new Date();
  await user.save();

  logger.info(`User logged in: ${user._id}`);

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Refresh access token
 */
export const refresh = async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken } = req.body;

  // Verify refresh token
  const payload = authService.verifyRefreshToken(refreshToken);

  // Fetch user
  const user = await User.findById(payload.userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (user.isBanned()) {
    throw new AppError('User is banned', 403, 'USER_BANNED', {
      bannedUntil: user.bannedUntil,
    });
  }

  // Generate new access token
  const accessToken = authService.generateAccessToken({
    userId: String(user._id),
    role: user.role,
    email: user.email,
  });

  logger.info(`Token refreshed for user: ${user._id}`);

  res.status(200).json({
    success: true,
    data: {
      accessToken,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};