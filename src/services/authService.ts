import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';
import { JWTPayload } from '../types';
import { logger } from '../utils/logger';

/**
 * Authentication Service
 * Handles JWT token generation, verification, and password hashing
 */
class AuthService {
  private readonly saltRounds = 10;

  /**
   * Hash a password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, this.saltRounds);
      return hash;
    } catch (error) {
      logger.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Error comparing password:', error);
      return false;
    }
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload: Omit<JWTPayload, 'type'>): string {
    try {
      const tokenPayload: JWTPayload = {
        ...payload,
        type: 'access',
      };

      return (jwt.sign as any)(tokenPayload, config.jwt.secret, {
        expiresIn: config.jwt.accessExpiry,
        issuer: 'mindsupport-api',
        audience: 'mindsupport-client',
      });
    } catch (error) {
      logger.error('Error generating access token:', error);
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: Omit<JWTPayload, 'type'>): string {
    try {
      const tokenPayload: JWTPayload = {
        ...payload,
        type: 'refresh',
      };

      return (jwt.sign as any)(tokenPayload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiry,
        issuer: 'mindsupport-api',
        audience: 'mindsupport-client',
      });
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: 'mindsupport-api',
        audience: 'mindsupport-client',
      }) as JWTPayload;

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'mindsupport-api',
        audience: 'mindsupport-client',
      }) as JWTPayload;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      logger.error('Error decoding token:', error);
      return null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();