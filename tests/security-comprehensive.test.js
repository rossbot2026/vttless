/**
 * Comprehensive VTTless Test Suite
 * Consolidated testing for JWT Security and Authentication
 */

const jwtSecurity = require('backend/utils/jwtSecurity.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock data for testing
const mockUser = {
  id: 'testuserid',
  username: 'testuser',
  email: 'test@example.com',
  roles: ['user']
};

describe('🔐 VTTless Security & Authentication Tests', () => {
  
  describe('JWT Security Module', () => {
    
    test('should generate valid access token', () => {
      const token = jwtSecurity.generateAccessToken(mockUser);
      
      expect(typeof token).toBe('string');
      expect(token).not.toBe('');
      
      const decoded = jwt.decode(token);
      expect(decoded).toHaveProperty('id', mockUser.id);
      expect(decoded).toHaveProperty('username', mockUser.username);
      expect(decoded).toHaveProperty('type', 'access');
    });

    test('should generate valid refresh token', () => {
      const token = jwtSecurity.generateRefreshToken(mockUser);
      
      expect(typeof token).toBe('string');
      expect(token).not.toBe('');
      
      const decoded = jwt.decode(token);
      expect(decoded).toHaveProperty('type', 'refresh');
    });

    test('should verify valid access token', () => {
      const token = jwtSecurity.generateAccessToken(mockUser);
      const verified = jwtSecurity.verifyAccessToken(token);
      
      expect(verified).toEqual(expect.objectContaining(mockUser));
      expect(verified.type).toBe('access');
    });

    test('should reject invalid access token', () => {
      expect(() => {
        jwtSecurity.verifyAccessToken('invalid.token');
      }).toThrow();
    });

    test('should validate token security for valid token', () => {
      const token = jwtSecurity.generateAccessToken(mockUser);
      const decoded = jwt.decode(token);
      const validation = jwtSecurity.validateTokenSecurity(decoded);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Password Security', () => {
    
    test('should hash password correctly', async () => {
      const password = 'StrongPassword123!';
      const hashed = await bcrypt.hash(password, 10);
      
      expect(hashed).not.toBe(password);
      expect(typeof hashed).toBe('string');
      expect(hashed.length).toBeGreaterThan(0);
    });

    test('should compare password correctly', async () => {
      const password = 'StrongPassword123!';
      const hashed = await bcrypt.hash(password, 10);
      
      const isMatch = await bcrypt.compare(password, hashed);
      expect(isMatch).toBe(true);
      
      const isWrong = await bcrypt.compare('WrongPassword', hashed);
      expect(isWrong).toBe(false);
    });
  });

  describe('Token Extraction', () => {
    
    test('should extract token from Authorization header', () => {
      const req = {
        headers: {
          authorization: 'Bearer test-token-123'
        }
      };
      
      const token = jwtSecurity.extractTokenFromRequest(req);
      expect(token).toBe('test-token-123');
    });

    test('should extract token from cookie', () => {
      const req = {
        cookies: {
          'vttless-jwt': 'cookie-token-456'
        }
      };
      
      const token = jwtSecurity.extractTokenFromRequest(req);
      expect(token).toBe('cookie-token-456');
    });

    test('should return null when no token found', () => {
      const req = {};
      const token = jwtSecurity.extractTokenFromRequest(req);
      expect(token).toBeNull();
    });
  });

  describe('Token Blacklist', () => {
    
    test('should blacklist token', () => {
      const token = 'test-blacklist-token';
      const expiresAt = Date.now() + 3600000;
      
      jwtSecurity.tokenBlacklist.blacklistToken(token, expiresAt);
      expect(jwtSecurity.tokenBlacklist.isTokenBlacklisted(token)).toBe(true);
    });

    test('should check if token is blacklisted', () => {
      const token = 'test-blacklist-token-2';
      
      // Initially not blacklisted
      expect(jwtSecurity.tokenBlacklist.isTokenBlacklisted(token)).toBe(false);
      
      // After blacklisting
      const expiresAt = Date.now() + 3600000;
      jwtSecurity.tokenBlacklist.blacklistToken(token, expiresAt);
      expect(jwtSecurity.tokenBlacklist.isTokenBlacklisted(token)).toBe(true);
    });
  });

  describe('Cookie Options', () => {
    
    test('should return development cookie options', () => {
      process.env.NODE_ENV = 'development';
      const options = jwtSecurity.getSecureCookieOptions();
      
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.secure).toBe(false);
      expect(options.path).toBe('/');
    });

    test('should return production cookie options', () => {
      process.env.NODE_ENV = 'production';
      const options = jwtSecurity.getSecureCookieOptions();
      
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('strict');
      expect(options.secure).toBe(true);
      expect(options.path).toBe('/');
    });
  });

  describe('Security Configuration', () => {
    
    test('should have JWT configuration', () => {
      expect(jwtSecurity.jwtConfig).toBeDefined();
      expect(jwtSecurity.jwtConfig.issuer).toBe('vttless');
      expect(jwtSecurity.jwtConfig.audience).toBe('vttless-app');
      expect(jwtSecurity.jwtConfig.algorithm).toBe('HS256');
    });

    test('should validate environment variables', () => {
      expect(process.env.JWT_SECRET_KEY).toBeDefined();
      expect(process.env.JWT_REFRESH_SECRET_KEY).toBeDefined();
      expect(process.env.JWT_ISSUER).toBeDefined();
      expect(process.env.JWT_AUDIENCE).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    
    test('should complete full authentication flow', () => {
      // 1. Generate tokens
      const accessToken = jwtSecurity.generateAccessToken(mockUser);
      const refreshToken = jwtSecurity.generateRefreshToken(mockUser);
      
      // 2. Verify access token
      const verifiedUser = jwtSecurity.verifyAccessToken(accessToken);
      expect(verifiedUser.username).toBe(mockUser.username);
      
      // 3. Verify refresh token
      const verifiedRefresh = jwtSecurity.verifyRefreshToken(refreshToken);
      expect(verifiedRefresh.username).toBe(mockUser.username);
      
      // 4. Blacklist token
      const expiresAt = Date.now() + 3600000;
      jwtSecurity.tokenBlacklist.blacklistToken(accessToken, expiresAt);
      
      // 5. Check blacklist
      expect(jwtSecurity.tokenBlacklist.isTokenBlacklisted(accessToken)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    
    test('should handle malformed tokens gracefully', () => {
      expect(() => {
        jwtSecurity.verifyAccessToken('not.a.jwt');
      }).toThrow();
      
      expect(() => {
        jwtSecurity.verifyAccessToken('');
      }).toThrow();
    });

    test('should handle empty credentials', () => {
      const emptyUser = {};
      const token = jwtSecurity.generateAccessToken(emptyUser);
      expect(typeof token).toBe('string');
    });
  });
});