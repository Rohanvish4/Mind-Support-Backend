import { authService } from '../../src/services/authService';
import { UserRole } from '../../src/types';

describe('AuthService', () => {
  describe('password hashing', () => {
    it('should hash a password', async () => {
      const password = 'mySecurePassword123';
      const hash = await authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should verify correct password', async () => {
      const password = 'mySecurePassword123';
      const hash = await authService.hashPassword(password);
      const isValid = await authService.comparePassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'mySecurePassword123';
      const wrongPassword = 'wrongPassword';
      const hash = await authService.hashPassword(password);
      const isValid = await authService.comparePassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });
  });

  describe('JWT token generation', () => {
    it('should generate access token', () => {
      const payload = {
        userId: '123456',
        role: UserRole.USER,
        email: 'test@example.com',
      };

      const token = authService.generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should generate refresh token', () => {
      const payload = {
        userId: '123456',
        role: UserRole.USER,
        email: 'test@example.com',
      };

      const token = authService.generateRefreshToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify valid access token', () => {
      const payload = {
        userId: '123456',
        role: UserRole.USER,
        email: 'test@example.com',
      };

      const token = authService.generateAccessToken(payload);
      const decoded = authService.verifyAccessToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.type).toBe('access');
    });

    it('should verify valid refresh token', () => {
      const payload = {
        userId: '123456',
        role: UserRole.USER,
        email: 'test@example.com',
      };

      const token = authService.generateRefreshToken(payload);
      const decoded = authService.verifyRefreshToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.type).toBe('refresh');
    });

    it('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => {
        authService.verifyAccessToken(invalidToken);
      }).toThrow();
    });

    it('should reject access token used as refresh', () => {
      const payload = {
        userId: '123456',
        role: UserRole.USER,
        email: 'test@example.com',
      };

      const accessToken = authService.generateAccessToken(payload);

      expect(() => {
        authService.verifyRefreshToken(accessToken);
      }).toThrow('Invalid token type');
    });
  });

  describe('token decoding', () => {
    it('should decode token without verification', () => {
      const payload = {
        userId: '123456',
        role: UserRole.USER,
        email: 'test@example.com',
      };

      const token = authService.generateAccessToken(payload);
      const decoded = authService.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(payload.userId);
    });
  });
});