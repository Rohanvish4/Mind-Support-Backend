import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../services/rateLimiter';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';
import { AuditLog } from '../models/AuditLog';

/**
 * Rate limiting middleware factory
 */
export const createRateLimiter = (options: {
  limit: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}) => {
  const {
    limit,
    windowMs,
    keyGenerator = (req) => {
      const authReq = req as AuthenticatedRequest;
      return authReq.user?.id || req.ip || 'anonymous';
    },
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later',
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const result = await rateLimiter.checkLimit(key, limit, windowMs);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

      if (!result.allowed) {
        // Log rate limit exceeded
        const authReq = req as AuthenticatedRequest;
        await AuditLog.create({
          action: 'rate_limit_exceeded',
          actorUserId: authReq.user?.id,
          target: `${req.method} ${req.path}`,
          timestamp: new Date(),
          meta: {
            ip: req.ip,
            key,
            limit,
            windowMs,
          },
        });

        logger.warn(`Rate limit exceeded for key: ${key}`);

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message,
            details: {
              limit,
              retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
            },
          },
        });
      }

      // Handle conditional skipping
      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalSend = res.send;
        res.send = function(data: any) {
          const statusCode = res.statusCode;
          const shouldSkip = 
            (skipSuccessfulRequests && statusCode < 400) ||
            (skipFailedRequests && statusCode >= 400);
          
          if (shouldSkip) {
            // Reset the limit for this request
            rateLimiter.reset(key);
          }
          
          return originalSend.call(this, data);
        };
      }

      return next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // Fail open - allow the request
      return next();
    }
  };
};

// Predefined rate limiters
export const authLimiter = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: false,
});

export const apiLimiter = createRateLimiter({
  limit: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

export const strictLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many requests, please slow down',
});