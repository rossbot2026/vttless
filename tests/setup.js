/**
 * Test Environment Setup
 * 
 * This file sets up the test environment before running tests:
 * - Configures test environment variables
 * - Sets up test database connection
 * - Provides cleanup utilities
 */

// Load environment variables for testing FIRST
require('dotenv').config({ path: '.env.test' });

// Ensure test environment is set
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET_KEY = process.env.TEST_JWT_SECRET_KEY || 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET_KEY = process.env.TEST_JWT_REFRESH_SECRET_KEY || 'test-jwt-refresh-secret-key';
process.env.JWT_ISSUER = process.env.TEST_JWT_ISSUER || 'vttless-test';
process.env.JWT_AUDIENCE = process.env.TEST_JWT_AUDIENCE || 'vttless-app-test';

// Also set main JWT variables to match test variables
process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || process.env.TEST_JWT_SECRET_KEY;
process.env.JWT_REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET_KEY || process.env.TEST_JWT_REFRESH_SECRET_KEY;
process.env.JWT_ISSUER = process.env.JWT_ISSUER || process.env.TEST_JWT_ISSUER;
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || process.env.TEST_JWT_AUDIENCE;

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

/**
 * Connect to in-memory MongoDB for testing
 */
beforeAll(async () => {
  // Create in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  
  console.log('Test database connected to:', mongoUri);
});

/**
 * Clear all collections before each test
 */
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

/**
 * Close database connection and stop MongoDB server after all tests
 */
afterAll(async () => {
  if (mongoServer) {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('Test database disconnected');
  }
});

/**
 * Global test helpers
 */
global.createTestUser = async (userData = {}) => {
  const { User } = require('../backend/models');
  const defaultUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword123',
    roles: []
  };
  
  const user = new User({ ...defaultUser, ...userData });
  await user.save();
  return user;
};

global.createTestToken = (payload = {}) => {
  const jwt = require('jsonwebtoken');
  const defaultPayload = {
    id: 'testuserid',
    username: 'testuser',
    email: 'test@example.com',
    roles: []
  };
  
  return jwt.sign(
    { ...defaultPayload, ...payload },
    process.env.TEST_JWT_SECRET_KEY || 'test-secret-key',
    {
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: 'vttless-test',
      audience: 'vttless-app-test'
    }
  );
};

global.cleanup = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};