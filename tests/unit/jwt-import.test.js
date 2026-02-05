/**
 * Test to verify JWT security module can be imported
 */

const jwtSecurity = require('backend/utils/jwtSecurity.js');

describe('JWT Security Module Import Test', () => {
  test('should be able to import jwtSecurity module', () => {
    expect(jwtSecurity).toBeDefined();
    expect(typeof jwtSecurity.generateAccessToken).toBe('function');
    expect(typeof jwtSecurity.verifyAccessToken).toBe('function');
  });

  test('should have all required functions', () => {
    expect(jwtSecurity.generateAccessToken).toBeDefined();
    expect(jwtSecurity.generateRefreshToken).toBeDefined();
    expect(jwtSecurity.verifyAccessToken).toBeDefined();
    expect(jwtSecurity.verifyRefreshToken).toBeDefined();
    expect(jwtSecurity.validateTokenSecurity).toBeDefined();
    expect(jwtSecurity.extractTokenFromRequest).toBeDefined();
    expect(jwtSecurity.getSecureCookieOptions).toBeDefined();
    expect(jwtSecurity.tokenBlacklist).toBeDefined();
  });
});