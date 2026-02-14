/**
 * Simple test to verify the testing environment is working
 */

// Load environment variables for unit tests
require('dotenv').config({ path: '.env.test' });

// Ensure test environment is set
process.env.NODE_ENV = 'test';
process.env.TEST_JWT_SECRET_KEY = process.env.TEST_JWT_SECRET_KEY || 'test-jwt-secret-key';
process.env.TEST_JWT_REFRESH_SECRET_KEY = process.env.TEST_JWT_REFRESH_SECRET_KEY || 'test-jwt-refresh-secret-key';
process.env.JWT_SECRET_KEY = process.env.TEST_JWT_SECRET_KEY;
process.env.JWT_REFRESH_SECRET_KEY = process.env.TEST_JWT_REFRESH_SECRET_KEY;

describe('Testing Environment', () => {
  test('should be able to run a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should have test environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET_KEY).toBeDefined();
    expect(process.env.TEST_JWT_SECRET_KEY).toBeDefined();
  });

  test('should be able to import required modules', () => {
    const jwt = require('jsonwebtoken');
    expect(jwt).toBeDefined();
    expect(typeof jwt.sign).toBe('function');
  });
});