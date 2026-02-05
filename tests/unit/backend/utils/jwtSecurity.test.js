/**
 * JWT Security Module Tests
 * Tests all JWT security functionality including:
 * - Token generation and validation
 * - Security claims validation
 * - Token blacklist functionality
 * - Refresh token mechanism
 */

const jwtSecurity = require('../../backend/utils/jwtSecurity.js');
const jwt = require('jsonwebtoken');
const mockTokens = require('../../fixtures/tokens.js');

describe('JWT Security Module', () => {
  describe('Token Generation', () => {
    test('should generate valid access token with all required claims', () => {
      const payload = {
        id: 'testuserid',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user']
      };

      const token = jwtSecurity.generateAccessToken(payload);
      
      // Should be a valid JWT
      expect(typeof token).toBe('string');
      expect(token).not.toBe('');
      
      // Should be able to decode (but not verify without secret)
      const decoded = jwt.decode(token);
      expect(decoded).toHaveProperty('id', payload.id);
      expect(decoded).toHaveProperty('username', payload.username);
      expect(decoded).toHaveProperty('email', payload.email);
      expect(decoded).toHaveProperty('roles', payload.roles);
      expect(decoded).toHaveProperty('type', 'access');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('jti');
      expect(decoded).toHaveProperty('iss', 'vttless');
      expect(decoded).toHaveProperty('aud', 'vttless-app');
    });

    test('should generate valid refresh token with different claims', () => {
      const payload = {
        id: 'testuserid',
        username: 'testuser'
      };

      const token = jwtSecurity.generateRefreshToken(payload);
      
      // Should be a valid JWT
      expect(typeof token).toBe('string');
      expect(token).not.toBe('');
      
      // Should have refresh-specific claims
      const decoded = jwt.decode(token);
      expect(decoded).toHaveProperty('type', 'refresh');
      expect(decoded).toHaveProperty('iss', 'vttless');
      expect(decoded).toHaveProperty('aud', 'vttless-app');
    });

    test('should generate unique token IDs for each token', () => {
      const payload = {
        id: 'testuserid',
        username: 'testuser'
      };

      const token1 = jwtSecurity.generateAccessToken(payload);
      const token2 = jwtSecurity.generateAccessToken(payload);
      
      // Tokens should be different
      expect(token1).not.toBe(token2);
      
      // JWT IDs should be different
      const decoded1 = jwt.decode(token1);
      const decoded2 = jwt.decode(token2);
      expect(decoded1.jti).not.toBe(decoded2.jti);
    });
  });

  describe('Token Verification', () => {
    test('should successfully verify valid access token', () => {
      const payload = {
        id: 'testuserid',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user']
      };

      const token = jwtSecurity.generateAccessToken(payload);
      const verified = jwtSecurity.verifyAccessToken(token);
      
      expect(verified).toEqual(expect.objectContaining(payload));
      expect(verified.type).toBe('access');
    });

    test('should successfully verify valid refresh token', () => {
      const payload = {
        id: 'testuserid',
        username: 'testuser'
      };

      const token = jwtSecurity.generateRefreshToken(payload);
      const verified = jwtSecurity.verifyRefreshToken(token);
      
      expect(verified).toEqual(expect.objectContaining(payload));
      expect(verified.type).toBe('refresh');
    });

    test('should throw error for invalid access token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        jwtSecurity.verifyAccessToken(invalidToken);
      }).toThrow();
    });

    test('should throw error for expired access token', () => {
      const expiredToken = mockTokens.expiredAccessToken();
      
      expect(() => {
        jwtSecurity.verifyAccessToken(expiredToken);
      }).toThrow();
    });

    test('should throw error for token with invalid issuer', () => {
      const invalidIssuerToken = mockTokens.invalidIssuerToken;
      
      expect(() => {
        jwtSecurity.verifyAccessToken(invalidIssuerToken);
      }).toThrow();
    });

    test('should throw error for token with invalid audience', () => {
      const invalidAudienceToken = mockTokens.invalidAudienceToken;
      
      expect(() => {
        jwtSecurity.verifyAccessToken(invalidAudienceToken);
      }).toThrow();
    });

    test('should throw error for token with wrong algorithm', () => {
      const wrongAlgorithmToken = mockTokens.wrongAlgorithmToken;
      
      expect(() => {
        jwtSecurity.verifyAccessToken(wrongAlgorithmToken);
      }).toThrow();
    });
  });

  describe('Token Security Validation', () => {
    test('should validate token security for valid token', () => {
      const payload = {
        id: 'testuserid',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user']
      };

      const token = jwtSecurity.generateAccessToken(payload);
      const decoded = jwt.decode(token);
      const validation = jwtSecurity.validateTokenSecurity(decoded);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect invalid issuer', () => {
      const decoded = jwt.decode(mockTokens.invalidIssuerToken);
      const validation = jwtSecurity.validateTokenSecurity(decoded);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid token issuer');
    });

    test('should detect invalid audience', () => {
      const decoded = jwt.decode(mockTokens.invalidAudienceToken);
      const validation = jwtSecurity.validateTokenSecurity(decoded);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid token audience');
    });

    test('should detect missing token ID', () => {
      const decoded = jwt.decode(mockTokens.missingJtiToken);
      const validation = jwtSecurity.validateTokenSecurity(decoded);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing token ID (jti)');
    });

    test('should detect invalid token type', () => {
      const decoded = jwt.decode(mockTokens.validAccessToken());
      delete decoded.type; // Remove type to make it invalid
      const validation = jwtSecurity.validateTokenSecurity(decoded);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid token type');
    });
  });

  describe('Token Blacklist', () => {
    test('should add token to blacklist', () => {
      const token = 'test-token';
      const expiresAt = Date.now() + 3600000; // 1 hour from now
      
      jwtSecurity.tokenBlacklist.blacklistToken(token, expiresAt);
      
      expect(jwtSecurity.tokenBlacklist.isTokenBlacklisted(token)).toBe(true);
    });

    test('should check if token is blacklisted', () => {
      const token = 'test-token';
      const expiresAt = Date.now() + 3600000; // 1 hour from now
      
      // Initially not blacklisted
      expect(jwtSecurity.tokenBlacklist.isTokenBlacklisted(token)).toBe(false);
      
      // After blacklisting
      jwtSecurity.tokenBlacklist.blacklistToken(token, expiresAt);
      expect(jwtSecurity.tokenBlacklist.isTokenBlacklisted(token)).toBe(true);
    });

    test('should remove expired tokens from blacklist', (done) => {
      const token = 'test-token';
      const pastExpiresAt = Date.now() - 1000; // 1 second ago
      
      // Add expired token
      jwtSecurity.tokenBlacklist.blacklistToken(token, pastExpiresAt);
      
      // Should still be considered blacklisted immediately (before cleanup)
      expect(jwtSecurity.tokenBlacklist.isTokenBlacklisted(token)).toBe(true);
      
      // Wait for cleanup interval (1 minute in production)
      setTimeout(() => {
        // After cleanup, expired token should be removed
        expect(jwtSecurity.tokenBlacklist.isTokenBlacklisted(token)).toBe(false);
        done();
      }, 1100); // Slightly longer than 1 second
    });

    test('should return blacklist size', () => {
      expect(jwtSecurity.tokenBlacklist.size()).toBe(0);
      
      jwtSecurity.tokenBlacklist.blacklistToken('token1', Date.now() + 3600000);
      jwtSecurity.tokenBlacklist.blacklistToken('token2', Date.now() + 3600000);
      
      expect(jwtSecurity.tokenBlacklist.size()).toBe(2);
    });
  });

  describe('Token Extraction', () => {
    test('should extract token from Authorization header', () => {
      const req = {
        headers: {
          authorization: 'Bearer test-token'
        }
      };
      
      const token = jwtSecurity.extractTokenFromRequest(req);
      expect(token).toBe('test-token');
    });

    test('should extract token from cookie', () => {
      const req = {
        cookies: {
          'vttless-jwt': 'test-token'
        }
      };
      
      const token = jwtSecurity.extractTokenFromRequest(req);
      expect(token).toBe('test-token');
    });

    test('should extract token from query parameter', () => {
      const req = {
        query: {
          token: 'test-token'
        }
      };
      
      const token = jwtSecurity.extractTokenFromRequest(req);
      expect(token).toBe('test-token');
    });

    test('should return null when no token found', () => {
      const req = {};
      const token = jwtSecurity.extractTokenFromRequest(req);
      expect(token).toBeNull();
    });

    test('should prioritize Authorization header over other sources', () => {
      const req = {
        headers: {
          authorization: 'Bearer header-token'
        },
        cookies: {
          'vttless-jwt': 'cookie-token'
        },
        query: {
          token: 'query-token'
        }
      };
      
      const token = jwtSecurity.extractTokenFromRequest(req);
      expect(token).toBe('header-token');
    });
  });

  describe('Secure Cookie Options', () => {
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

    test('should allow custom production flag', () => {
      process.env.NODE_ENV = 'development';
      const options = jwtSecurity.getSecureCookieOptions(true);
      
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('strict');
      expect(options.secure).toBe(true);
      expect(options.path).toBe('/');
    });
  });

  describe('Configuration', () => {
    test('should export jwt configuration', () => {
      expect(jwtSecurity.jwtConfig).toBeDefined();
      expect(jwtSecurity.jwtConfig.issuer).toBe('vttless');
      expect(jwtSecurity.jwtConfig.audience).toBe('vttless-app');
      expect(jwtSecurity.jwtConfig.algorithm).toBe('HS256');
    });
  });
});