/**
 * JWT Security Enhancement Module
 * 
 * This module implements comprehensive JWT security improvements including:
 * - Proper issuer and audience validation
 * - Algorithm restriction to prevent JWT attacks
 * - Token expiration handling
 * - Refresh token mechanism
 * - Token blacklist functionality
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// JWT Configuration
const jwtConfig = {
  // Standard JWT claims
  issuer: process.env.JWT_ISSUER || 'vttless',
  audience: process.env.JWT_AUDIENCE || 'vttless-app',
  algorithm: 'HS256', // Force specific algorithm to prevent algorithm confusion attacks
  expiresIn: process.env.JWT_EXPIRATION_MS || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION_MS || '7d',
  
  // Security options
  notBefore: 0, // Token valid immediately
  jwtid: true, // Add unique JWT ID for token tracking
  noTimestamp: false, // Include timestamp for expiration validation
  
  // Blacklist configuration
  blacklistGracePeriod: 60 * 1000, // 1 minute grace period for token invalidation
};

/**
 * Generate Access Token
 * Creates a JWT access token with proper security claims
 */
const generateAccessToken = (payload) => {
  const tokenPayload = {
    ...payload,
    type: 'access',
    iat: Math.floor(Date.now() / 1000), // Issued at timestamp
    jti: generateJTI(), // Unique token identifier
  };

  return jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY, {
    algorithm: jwtConfig.algorithm,
    expiresIn: jwtConfig.expiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    notBefore: jwtConfig.notBefore,
  });
};

/**
 * Generate Refresh Token
 * Creates a refresh token with longer expiration
 */
const generateRefreshToken = (payload) => {
  const tokenPayload = {
    ...payload,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    jti: generateJTI(),
  };

  return jwt.sign(tokenPayload, process.env.JWT_REFRESH_SECRET_KEY || process.env.JWT_SECRET_KEY, {
    algorithm: jwtConfig.algorithm,
    expiresIn: jwtConfig.refreshExpiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    notBefore: jwtConfig.notBefore,
  });
};

/**
 * Verify Access Token
 * Validates JWT token with comprehensive security checks
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET_KEY, {
    algorithms: [jwtConfig.algorithm],
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    jwtid: true,
    clockTimestamp: Math.floor(Date.now() / 1000),
    clockTolerance: 0, // No clock tolerance for security
  });
};

/**
 * Verify Refresh Token
 * Validates refresh token with appropriate settings
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET_KEY || process.env.JWT_SECRET_KEY, {
    algorithms: [jwtConfig.algorithm],
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    jwtid: true,
    clockTimestamp: Math.floor(Date.now() / 1000),
    clockTolerance: 0,
  });
};

/**
 * Generate Unique Token ID
 * Creates a unique identifier for each token
 */
const generateJTI = () => {
  return require('crypto').randomBytes(16).toString('hex');
};

/**
 * Token Blacklist Service
 * Manages token invalidation (logout functionality)
 */
class TokenBlacklist {
  constructor() {
    this.blacklistedTokens = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), jwtConfig.blacklistGracePeriod);
  }

  /**
   * Add token to blacklist
   */
  blacklistToken(token, expiresAt) {
    this.blacklistedTokens.set(token, {
      blacklistedAt: Date.now(),
      expiresAt,
    });
  }

  /**
   * Check if token is blacklisted
   */
  isTokenBlacklisted(token) {
    const tokenInfo = this.blacklistedTokens.get(token);
    if (!tokenInfo) return false;

    // Remove expired tokens
    if (tokenInfo.expiresAt <= Date.now()) {
      this.blacklistedTokens.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Cleanup expired tokens
   */
  cleanup() {
    const now = Date.now();
    for (const [token, info] of this.blacklistedTokens.entries()) {
      if (info.expiresAt <= now) {
        this.blacklistedTokens.delete(token);
      }
    }
  }

  /**
   * Get blacklist size (for monitoring)
   */
  size() {
    return this.blacklistedTokens.size;
  }
}

// Create singleton instance
const tokenBlacklist = new TokenBlacklist();

/**
 * Validate Token Security
 * Additional security checks beyond standard JWT verification
 */
const validateTokenSecurity = (decodedToken) => {
  const errors = [];

  // Check standard claims
  if (!decodedToken.iss || decodedToken.iss !== jwtConfig.issuer) {
    errors.push('Invalid token issuer');
  }

  if (!decodedToken.aud || decodedToken.aud !== jwtConfig.audience) {
    errors.push('Invalid token audience');
  }

  if (!decodedToken.jti) {
    errors.push('Missing token ID (jti)');
  }

  // Check algorithm (prevent algorithm confusion attacks)
  if (decodedToken.alg && decodedToken.alg !== jwtConfig.algorithm) {
    errors.push('Invalid token algorithm');
  }

  // Check token type
  if (!decodedToken.type || !['access', 'refresh'].includes(decodedToken.type)) {
    errors.push('Invalid token type');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Extract Token from Request
 * Securely extracts JWT from various sources
 */
const extractTokenFromRequest = (req) => {
  // First try Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Then try cookie
  if (req.cookies && req.cookies['vttless-jwt']) {
    return req.cookies['vttless-jwt'];
  }

  // Check request body for refresh token (for /auth/refresh endpoint)
  if (req.body && req.body.refreshToken) {
    return req.body.refreshToken;
  }

  // Finally try query parameter (less secure, only for specific endpoints)
  if (req.query && req.query.token) {
    return req.query.token;
  }

  return null;
};

/**
 * Create Secure Cookie Options
 * Generates secure cookie options based on environment
 */
const getSecureCookieOptions = (isProduction = process.env.NODE_ENV === 'production') => {
  const baseOptions = {
    httpOnly: true,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  };

  if (isProduction) {
    baseOptions.secure = true;
    baseOptions.domain = process.env.COOKIE_DOMAIN;
  }

  return baseOptions;
};

module.exports = {
  // Token generation
  generateAccessToken,
  generateRefreshToken,
  
  // Token verification
  verifyAccessToken,
  verifyRefreshToken,
  
  // Security utilities
  validateTokenSecurity,
  extractTokenFromRequest,
  getSecureCookieOptions,
  
  // Blacklist service
  tokenBlacklist,
  
  // Configuration
  jwtConfig,
};