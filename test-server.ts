import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './src/utils/logger';
import { errorHandler } from './src/middleware/errorHandler';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (works without database)
app.get('/health', (_req, res) => {
  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Server is running (MongoDB connection not tested in this mode)'
  });
});

// Basic info endpoint
app.get('/api/info', (_req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      name: 'MindSupport Backend API',
      version: '1.0.0',
      description: 'Mobile-first mental health support platform',
      endpoints: [
        'GET /health - Health check',
        'GET /api/info - API information',
        'POST /api/auth/register - User registration (requires MongoDB)',
        'POST /api/auth/login - User login (requires MongoDB)',
        'GET /api/tips - Get daily tips (requires MongoDB)',
        'POST /api/tips/publish - Publish tip (requires MongoDB)',
      ]
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

// Mock auth endpoints (for testing structure without database)
app.post('/api/auth/register', (_req, res) => {
  return res.status(503).json({
    success: false,
    error: {
      code: 'DATABASE_UNAVAILABLE',
      message: 'MongoDB connection required for user registration',
      details: 'Please set up MongoDB connection to use this endpoint'
    }
  });
});

app.post('/api/auth/login', (_req, res) => {
  return res.status(503).json({
    success: false,
    error: {
      code: 'DATABASE_UNAVAILABLE',
      message: 'MongoDB connection required for user login',
      details: 'Please set up MongoDB connection to use this endpoint'
    }
  });
});

// Global error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      'GET /health',
      'GET /api/info',
      'POST /api/auth/register (requires MongoDB)',
      'POST /api/auth/login (requires MongoDB)'
    ]
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 MindSupport API (Test Mode) running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.info(`ℹ️  API info: http://localhost:${PORT}/api/info`);
  logger.warn('⚠️  Running in test mode - MongoDB not connected');
  logger.info('💡 To test with full functionality, set up MongoDB connection');
});

export { app };