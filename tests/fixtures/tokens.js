/**
 * Test Fixtures - JWT Token Data
 * Provides reusable JWT tokens for testing
 */

const jwt = require('jsonwebtoken');

const generateMockToken = (payload, type = 'access', expiresIn = '1h') => {
  return jwt.sign({
    ...payload,
    type,
    iat: Math.floor(Date.now() / 1000),
    jti: require('crypto').randomBytes(16).toString('hex')
  }, process.env.TEST_JWT_SECRET_KEY || 'test-secret-key', {
    algorithm: 'HS256',
    expiresIn,
    issuer: process.env.TEST_JWT_ISSUER || 'vttless-test',
    audience: process.env.TEST_JWT_AUDIENCE || 'vttless-app-test'
  });
};

const mockTokens = {
  // Valid access token
  validAccessToken: (userId = 'testuserid', username = 'testuser') => 
    generateMockToken({ id: userId, username, email: 'test@example.com' }, 'access', '1h'),

  // Valid refresh token
  validRefreshToken: (userId = 'testuserid', username = 'testuser') => 
    generateMockToken({ id: userId, username }, 'refresh', '7d'),

  // Expired access token
  expiredAccessToken: (userId = 'testuserid', username = 'testuser') => 
    generateMockToken({ id: userId, username, email: 'test@example.com' }, 'access', '-1h'),

  // Invalid token (malformed)
  invalidToken: 'invalid.jwt.token.here',

  // Malformed token (not proper JWT format)
  malformedToken: 'this.is.not.a.jwt.token',

  // Token with invalid issuer
  invalidIssuerToken: jwt.sign(
    { id: 'testuserid', username: 'testuser', email: 'test@example.com' },
    process.env.TEST_JWT_SECRET_KEY || 'test-secret-key',
    {
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: 'invalid-issuer', // Wrong issuer
      audience: process.env.TEST_JWT_AUDIENCE || 'vttless-app-test'
    }
  ),

  // Token with invalid audience
  invalidAudienceToken: jwt.sign(
    { id: 'testuserid', username: 'testuser', email: 'test@example.com' },
    process.env.TEST_JWT_SECRET_KEY || 'test-secret-key',
    {
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: process.env.TEST_JWT_ISSUER || 'vttless-test',
      audience: 'invalid-audience' // Wrong audience
    }
  ),

  // Token with wrong algorithm
  wrongAlgorithmToken: jwt.sign(
    { id: 'testuserid', username: 'testuser', email: 'test@example.com' },
    process.env.TEST_JWT_SECRET_KEY || 'test-secret-key',
    {
      algorithm: 'RS256', // Wrong algorithm (should be HS256)
      expiresIn: '1h',
      issuer: process.env.TEST_JWT_ISSUER || 'vttless-test',
      audience: process.env.TEST_JWT_AUDIENCE || 'vttless-app-test'
    }
  ),

  // Token missing required fields
  missingFieldsToken: jwt.sign(
    { id: 'testuserid' }, // Missing required fields like username, email
    process.env.TEST_JWT_SECRET_KEY || 'test-secret-key',
    {
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: process.env.TEST_JWT_ISSUER || 'vttless-test',
      audience: process.env.TEST_JWT_AUDIENCE || 'vttless-app-test'
    }
  ),

  // Token with missing JWT ID (jti)
  missingJtiToken: jwt.sign(
    { id: 'testuserid', username: 'testuser', email: 'test@example.com' },
    process.env.TEST_JWT_SECRET_KEY || 'test-secret-key',
    {
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: process.env.TEST_JWT_ISSUER || 'vttless-test',
      audience: process.env.TEST_JWT_AUDIENCE || 'vttless-app-test'
      // No jti field
    }
  )
};

module.exports = mockTokens;