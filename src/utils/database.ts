import mongoose from 'mongoose';
import { config } from '../config/env';
import { logger } from './logger';

/**
 * Connect to MongoDB
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.database.uri, {
      // Connection options
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    });

    logger.info('✅ MongoDB connected successfully');

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    throw error;
  }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
};

/**
 * Check database health
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const state = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    return state === 1;
  } catch (error) {
    logger.error('Error checking database health:', error);
    return false;
  }
};