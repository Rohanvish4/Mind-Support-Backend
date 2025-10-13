import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config/env';

/**
 * Custom error class
 */
export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  // Handle known AppError
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle Mongoose validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.message,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle Mongoose duplicate key errors
  if ((error as any).code === 11000) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: 'Resource already exists',
        details: (error as any).keyValue,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Default error response
  const statusCode = (error as any).statusCode || 500;
  const message = config.env === 'production' 
    ? 'An error occurred' 
    : error.message;

  return res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      ...(config.env !== 'production' && { stack: error.stack }),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};