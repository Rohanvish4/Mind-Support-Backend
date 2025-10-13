import { createClient, RedisClientType } from 'redis';
import { config } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Rate Limiter Service
 * Supports both Redis (production) and in-memory (development) storage
 */
class RateLimiterService {
  private redisClient: RedisClientType | null = null;
  private inMemoryStore: Map<string, { count: number; resetAt: number }> = new Map();
  private useRedis: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis client if URL is provided
   */
  private async initializeRedis() {
    if (!config.redis.url) {
      logger.info('📝 Rate limiter using in-memory storage (single instance only)');
      return;
    }

    try {
      this.redisClient = createClient({
        url: config.redis.url,
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.useRedis = false;
      });

      this.redisClient.on('connect', () => {
        logger.info('✅ Redis connected for rate limiting');
        this.useRedis = true;
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis, falling back to in-memory:', error);
      this.redisClient = null;
      this.useRedis = false;
    }
  }

  /**
   * Check rate limit using Redis
   */
  private async checkRedisLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    if (!this.redisClient || !this.useRedis) {
      throw new Error('Redis not available');
    }

    const now = Date.now();
    const windowKey = `ratelimit:${key}`;

    try {
      const count = await this.redisClient.incr(windowKey);
      
      if (count === 1) {
        // First request in window, set expiry
        await this.redisClient.pExpire(windowKey, windowMs);
      }

      const ttl = await this.redisClient.pTTL(windowKey);
      const resetAt = now + ttl;

      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt,
      };
    } catch (error) {
      logger.error('Redis rate limit check error:', error);
      // Fall back to allowing the request
      return { allowed: true, remaining: limit, resetAt: now + windowMs };
    }
  }

  /**
   * Check rate limit using in-memory storage
   */
  private checkMemoryLimit(
    key: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const record = this.inMemoryStore.get(key);

    if (!record || now > record.resetAt) {
      // New window
      this.inMemoryStore.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: now + windowMs,
      };
    }

    // Existing window
    record.count++;
    this.inMemoryStore.set(key, record);

    return {
      allowed: record.count <= limit,
      remaining: Math.max(0, limit - record.count),
      resetAt: record.resetAt,
    };
  }

  /**
   * Check rate limit for a key
   */
  async checkLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    try {
      if (this.useRedis && this.redisClient) {
        return await this.checkRedisLimit(key, limit, windowMs);
      } else {
        return this.checkMemoryLimit(key, limit, windowMs);
      }
    } catch (error) {
      logger.error('Rate limit check error:', error);
      // Fail open - allow the request
      return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
    }
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.del(`ratelimit:${key}`);
      } else {
        this.inMemoryStore.delete(key);
      }
    } catch (error) {
      logger.error('Error resetting rate limit:', error);
    }
  }

  /**
   * Clean up expired in-memory entries
   */
  private cleanupMemory() {
    const now = Date.now();
    for (const [key, record] of this.inMemoryStore.entries()) {
      if (now > record.resetAt) {
        this.inMemoryStore.delete(key);
      }
    }
  }

  /**
   * Start periodic cleanup for in-memory storage
   */
  startCleanup(intervalMs: number = 60000) {
    if (!this.useRedis) {
      setInterval(() => {
        this.cleanupMemory();
      }, intervalMs);
      logger.info('Started in-memory rate limit cleanup');
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
      logger.info('Redis connection closed');
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiterService();