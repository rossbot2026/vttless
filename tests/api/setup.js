/**
 * API Testing Infrastructure
 * 
 * This file sets up the testing environment for API testing:
 * - Configures test server
 * - Sets up test database
 * - Provides test utilities and fixtures
 * - Manages test lifecycle
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../backend/index');
const User = require('../../backend/models/user');
const bcrypt = require('bcryptjs');

// Global test variables
let mongoServer;
let testServer;

// Test user data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
};

const adminUser = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'AdminPassword123!',
  firstName: 'Admin',
  lastName: 'User',
  roles: ['admin']
};

// Test JWT tokens
let testAccessToken;
let testRefreshToken;
let adminAccessToken;

/**
 * Setup before all tests
 */
beforeAll(async () => {
  // Start MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to test database
  await mongoose.connect(mongoUri);
  
  // Create test users
  await createTestUsers();
  
  // Generate test tokens
  await generateTestTokens();
  
  // Start test server
  testServer = app;
});

/**
 * Cleanup after all tests
 */
afterAll(async () => {
  try {
    // Close database connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    // Stop MongoDB Memory Server
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
});

/**
 * Setup before each test
 */
beforeEach(async () => {
  // Clean up collections before each test
  try {
    await User.deleteMany({});
  } catch (error) {
    console.error('BeforeEach error:', error);
  }
});

/**
 * Helper function to create test users
 */
async function createTestUsers() {
  // Hash passwords
  const hashedPassword = await bcrypt.hash(testUser.password, 10);
  const adminHashedPassword = await bcrypt.hash(adminUser.password, 10);
  
  // Create test users
  await User.create({
    username: testUser.username,
    email: testUser.email,
    password: hashedPassword,
    firstName: testUser.firstName,
    lastName: testUser.lastName,
    roles: ['user']
  });
  
  await User.create({
    username: adminUser.username,
    email: adminUser.email,
    password: adminHashedPassword,
    firstName: adminUser.firstName,
    lastName: adminUser.lastName,
    roles: adminUser.roles
  });
}

/**
 * Helper function to generate test tokens
 */
async function generateTestTokens() {
  // This would normally use your JWT security module
  // For testing, we'll create mock tokens
  testAccessToken = 'mock-test-access-token';
  testRefreshToken = 'mock-test-refresh-token';
  adminAccessToken = 'mock-admin-access-token';
}

/**
 * Helper function to get test headers
 */
function getAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Helper function to create test request
 */
function createTestRequest() {
  return {
    app: testServer,
    get: (path) => request(testServer).get(path),
    post: (path) => request(testServer).post(path),
    put: (path) => request(testServer).put(path),
    delete: (path) => request(testServer).delete(path),
    patch: (path) => request(testServer).patch(path),
    withAuth: (token) => ({
      get: (path) => request(testServer).get(path).set(getAuthHeaders(token)),
      post: (path) => request(testServer).post(path).set(getAuthHeaders(token)),
      put: (path) => request(testServer).put(path).set(getAuthHeaders(token)),
      delete: (path) => request(testServer).delete(path).set(getAuthHeaders(token)),
      patch: (path) => request(testServer).patch(path).set(getAuthHeaders(token))
    })
  };
}

// Export test utilities
module.exports = {
  testUser,
  adminUser,
  testAccessToken,
  testRefreshToken,
  adminAccessToken,
  createTestRequest,
  getAuthHeaders
};