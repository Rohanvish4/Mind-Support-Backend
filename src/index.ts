import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDatabase } from './utils/database';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { setupRoutes } from './routes';
import * as Sentry from '@sentry/node';
import { env } from './config/env';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Initialize Sentry (if configured)
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
  app.use(Sentry.Handlers.requestHandler());
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(cors({
  origin: env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});

// Setup API routes
setupRoutes(app);

// Sentry error handler (must be before other error handlers)
if (env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Global error handler (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    const PORT = env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`🚀 MindSupport API server running on port ${PORT}`);
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

export { app };