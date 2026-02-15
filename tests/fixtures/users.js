/**
 * Test Fixtures - User Data
 * Provides reusable test user data for testing
 */

const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

const mockUsers = {
  // Valid user for testing
  validUser: {
    username: 'testuser',
    email: 'test@example.com',
    password: await hashPassword('ValidPassword123!'),
    roles: []
  },

  // Admin user for testing
  adminUser: {
    username: 'admin',
    email: 'admin@example.com',
    password: await hashPassword('AdminPassword123!'),
    roles: ['admin']
  },

  // Another regular user
  anotherUser: {
    username: 'anotheruser',
    email: 'another@example.com',
    password: await hashPassword('AnotherPassword123!'),
    roles: ['user']
  },

  // User with weak password (for testing validation)
  weakPasswordUser: {
    username: 'weakuser',
    email: 'weak@example.com',
    password: await hashPassword('weak'),
    roles: ['user']
  },

  // User with invalid email
  invalidEmailUser: {
    username: 'invaliduser',
    email: 'invalid-email',
    password: await hashPassword('ValidPassword123!'),
    roles: ['user']
  },

  // User with duplicate username (for testing uniqueness)
  duplicateUser: {
    username: 'duplicateuser',
    email: 'duplicate@example.com',
    password: await hashPassword('ValidPassword123!'),
    roles: ['user']
  }
};

module.exports = mockUsers;