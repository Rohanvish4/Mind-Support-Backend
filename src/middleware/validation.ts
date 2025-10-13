import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { logger } from '../utils/logger';

/**
 * Validation middleware factory
 */
export const validate = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Validation error:', errors);

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors,
          },
        });
      }

      return next(error);
    }
  };
};

// Common validation schemas
export const schemas = {
  // Auth schemas
  register: {
    body: z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      displayName: z.string().min(2, 'Display name must be at least 2 characters').max(100),
    }),
  },

  login: {
    body: z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(1, 'Password is required'),
    }),
  },

  refresh: {
    body: z.object({
      refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
  },

  // Stream schemas
  streamToken: {
    body: z.object({
      anonymousHandle: z.string().optional(),
    }),
  },

  createChannel: {
    body: z.object({
      channelId: z.string().optional(),
      type: z.enum(['messaging', 'team']).default('messaging'),
      members: z.array(z.string()).min(1, 'At least one member required'),
      extra: z.object({
        title: z.string().optional(),
        tags: z.array(z.string()).optional(),
        isPrivate: z.boolean().optional(),
      }).optional(),
    }),
  },

  joinChannel: {
    body: z.object({
      streamChannelId: z.string().min(1, 'Channel ID is required'),
      asAnonymousHandle: z.string().optional(),
    }),
  },

  // Report schemas
  createReport: {
    body: z.object({
      targetType: z.enum(['message', 'user', 'channel', 'resource']),
      targetId: z.string().min(1, 'Target ID is required'),
      reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
    }),
  },

  resolveModeration: {
    body: z.object({
      reportId: z.string().min(1, 'Report ID is required'),
      action: z.enum(['dismiss', 'remove', 'banUser', 'suspendChannel']),
      comment: z.string().max(2000).optional(),
      banDurationHours: z.number().positive().optional(),
    }),
  },

  // Daily tip schema
  publishTip: {
    body: z.object({
      content: z.string().min(10, 'Content must be at least 10 characters').optional(),
      type: z.enum(['text', 'activity', 'image', 'video']).optional(),
      scheduledFor: z.string().datetime().optional(),
    }),
  },

  // Pagination schema
  pagination: {
    query: z.object({
      page: z.string().transform(Number).pipe(z.number().int().positive()).default('1'),
      limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default('20'),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    }),
  },
};