import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';
import { authService } from '../services/authService';
import { User } from '../models/User';
import { logger } from '../utils/logger';

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = authService.verifyAccessToken(token);

    // Fetch user from database
    const user = await User.findById(payload.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Check if user is banned
    if (user.isBanned()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_BANNED',
          message: 'User is banned',
          details: {
            bannedUntil: user.bannedUntil,
          },
        },
      });
    }

    // Attach user to request
    req.user = {
      id: String(user._id),
      role: user.role,
      email: user.email,
      displayName: user.displayName,
    };

    // Update last seen
    user.lastSeenAt = new Date();
    await user.save();

    return next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: error.message || 'Invalid or expired token',
      },
    });
  }
};

/**
 * Middleware to require specific role
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          details: {
            required: roles,
            current: req.user.role,
          },
        },
      });
    }

    return next();
  };
};

/**
 * Optional authentication (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.verifyAccessToken(token);
      
      const user = await User.findById(payload.userId);
      if (user && !user.isBanned()) {
        req.user = {
          id: String(user._id),
          role: user.role,
          email: user.email,
          displayName: user.displayName,
        };
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
    logger.debug('Optional auth failed:', error);
  }
  return next();
};