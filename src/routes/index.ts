import { Express } from 'express';
import authRoutes from './auth';
import streamRoutes from './stream';
import webhookRoutes from './webhook';
import reportRoutes from './report';
import moderationRoutes from './moderation';
import tipsRoutes from './tips';
import { logger } from '../utils/logger';

/**
 * Setup all API routes
 */
export const setupRoutes = (app: Express) => {
  // API prefix
  const API_PREFIX = '/api';

  // Mount routes
  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/stream`, streamRoutes);
  app.use(`${API_PREFIX}/webhook`, webhookRoutes);
  app.use(`${API_PREFIX}/report`, reportRoutes);
  app.use(`${API_PREFIX}/moderation`, moderationRoutes);
  app.use(`${API_PREFIX}/tips`, tipsRoutes);

  logger.info('✅ API routes configured');
};