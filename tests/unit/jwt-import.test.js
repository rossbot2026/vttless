/**
 * Test to verify JWT security module can be imported
 */

const { setupTestDB, teardownTestDB } = require('../utils/testHelper');

let jwtSecurity;

beforeAll(async () => {
  await setupTestDB();
  // Import the module after database is connected
  jwtSecurity = require('backend/utils/jwtSecurity.js');
});

afterAll(async () => {
  await teardownTestDB();
});

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