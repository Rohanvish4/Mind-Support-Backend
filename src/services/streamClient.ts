import { StreamChat } from 'stream-chat';
import { config } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Stream Chat Client Service
 * Wrapper for Stream Chat SDK with typed methods
 */
class StreamClientService {
  private client: StreamChat;
  private initialized: boolean = false;

  constructor() {
    this.client = StreamChat.getInstance(
      config.stream.apiKey,
      config.stream.apiSecret
    );
    this.initialized = true;
    logger.info('✅ Stream Chat client initialized');
  }

  /**
   * Get the underlying Stream client instance
   */
  getClient(): StreamChat {
    if (!this.initialized) {
      throw new Error('Stream client not initialized');
    }
    return this.client;
  }

  /**
   * Upsert a user in Stream
   */
  async upsertUser(userId: string, data: {
    name: string;
    image?: string;
    role?: string;
    [key: string]: any;
  }) {
    try {
      await this.client.upsertUser({
        id: userId,
        ...data,
        name: data.name,
        image: data.image,
        role: data.role || 'user',
      });
      logger.info(`Stream user upserted: ${userId}`);
    } catch (error) {
      logger.error('Error upserting Stream user:', error);
      throw error;
    }
  }

  /**
   * Create a Stream token for a user
   */
  createToken(userId: string, exp?: number): string {
    try {
      const token = this.client.createToken(userId, exp);
      logger.debug(`Stream token created for user: ${userId}`);
      return token;
    } catch (error) {
      logger.error('Error creating Stream token:', error);
      throw error;
    }
  }

  /**
   * Create a channel
   */
  async createChannel(
    type: string,
    channelId: string,
    creatorId: string,
    data?: {
      name?: string;
      members?: string[];
      [key: string]: any;
    }
  ) {
    try {
      const channel = this.client.channel(type, channelId, {
        created_by_id: creatorId,
        name: data?.name,
        members: data?.members || [creatorId],
        ...data,
      });

      await channel.create();
      logger.info(`Stream channel created: ${type}:${channelId}`);
      return channel;
    } catch (error) {
      logger.error('Error creating Stream channel:', error);
      throw error;
    }
  }

  /**
   * Add members to a channel
   */
  async addMembers(channelType: string, channelId: string, userIds: string[]) {
    try {
      const channel = this.client.channel(channelType, channelId);
      await channel.addMembers(userIds);
      logger.info(`Added members to channel ${channelType}:${channelId}:`, userIds);
    } catch (error) {
      logger.error('Error adding members to channel:', error);
      throw error;
    }
  }

  /**
   * Remove members from a channel
   */
  async removeMembers(channelType: string, channelId: string, userIds: string[]) {
    try {
      const channel = this.client.channel(channelType, channelId);
      await channel.removeMembers(userIds);
      logger.info(`Removed members from channel ${channelType}:${channelId}:`, userIds);
    } catch (error) {
      logger.error('Error removing members from channel:', error);
      throw error;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, hard: boolean = false) {
    try {
      await this.client.deleteMessage(messageId, hard);
      logger.info(`Message deleted: ${messageId} (hard: ${hard})`);
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Flag a message for moderation
   */
  async flagMessage(messageId: string, userId: string, reason?: string) {
    try {
      await this.client.flagMessage(messageId, {
        user_id: userId,
        reason,
      });
      logger.info(`Message flagged: ${messageId} by user: ${userId}`);
    } catch (error) {
      logger.error('Error flagging message:', error);
      throw error;
    }
  }

  /**
   * Ban a user
   */
  async banUser(
    targetUserId: string,
    options?: {
      timeout?: number;
      reason?: string;
      bannedBy?: string;
    }
  ) {
    try {
      await this.client.banUser(targetUserId, {
        timeout: options?.timeout,
        reason: options?.reason,
        banned_by_id: options?.bannedBy,
      });
      logger.info(`User banned: ${targetUserId}`, options);
    } catch (error) {
      logger.error('Error banning user:', error);
      throw error;
    }
  }

  /**
   * Unban a user
   */
  async unbanUser(targetUserId: string) {
    try {
      await this.client.unbanUser(targetUserId);
      logger.info(`User unbanned: ${targetUserId}`);
    } catch (error) {
      logger.error('Error unbanning user:', error);
      throw error;
    }
  }

  /**
   * Deactivate a user
   */
  async deactivateUser(userId: string, options?: {
    mark_messages_deleted?: boolean;
    hard_delete?: boolean;
  }) {
    try {
      await this.client.deactivateUser(userId, options);
      logger.info(`User deactivated: ${userId}`, options);
    } catch (error) {
      logger.error('Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * Reactivate a user
   */
  async reactivateUser(userId: string, options?: {
    name?: string;
    restore_messages?: boolean;
  }) {
    try {
      await this.client.reactivateUser(userId, options);
      logger.info(`User reactivated: ${userId}`);
    } catch (error) {
      logger.error('Error reactivating user:', error);
      throw error;
    }
  }

  /**
   * Send a system message to a channel
   */
  async sendSystemMessage(
    channelType: string,
    channelId: string,
    text: string,
    userId: string = 'system'
  ) {
    try {
      const channel = this.client.channel(channelType, channelId);
      await channel.sendMessage({
        text,
        user_id: userId,
        type: 'system',
      });
      logger.info(`System message sent to ${channelType}:${channelId}`);
    } catch (error) {
      logger.error('Error sending system message:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    try {
      return this.client.verifyWebhook(rawBody, signature);
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }
}

// Export singleton instance
export const streamClient = new StreamClientService();