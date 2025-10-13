import { ProcessedMessage } from '../models/ProcessedMessage';
import { logger } from '../utils/logger';

/**
 * Idempotency Service
 * Ensures webhook messages are processed only once
 */
class IdempotencyService {
  /**
   * Check if message has been processed
   */
  async isProcessed(messageId: string): Promise<boolean> {
    try {
      const record = await ProcessedMessage.findOne({ messageId });
      return record !== null;
    } catch (error) {
      logger.error('Error checking message processed status:', error);
      // Fail safe: assume not processed to avoid blocking legitimate messages
      return false;
    }
  }

  /**
   * Mark message as processed
   */
  async markProcessed(messageId: string): Promise<void> {
    try {
      await ProcessedMessage.create({
        messageId,
        processedAt: new Date(),
      });
      logger.debug(`Message marked as processed: ${messageId}`);
    } catch (error) {
      // Ignore duplicate key errors (race condition)
      if ((error as any).code !== 11000) {
        logger.error('Error marking message as processed:', error);
      }
    }
  }

  /**
   * Clean up old processed messages (optional manual cleanup)
   */
  async cleanup(olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await ProcessedMessage.deleteMany({
        processedAt: { $lt: cutoffDate },
      });

      logger.info(`Cleaned up ${result.deletedCount} old processed messages`);
      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Error cleaning up processed messages:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const idempotencyService = new IdempotencyService();