/**
 * Authentication Controller Tests
 * Tests all authentication endpoints and functionality
 */

const Auth = require('../../backend/controllers/Auth.js');
const AuthHelper = require('../../utils/authHelper.js');
const SecurityHelper = require('../../utils/securityHelper.js');
const mockUsers = require('../../fixtures/users.js');
const mockTokens = require('../../fixtures/tokens.js');

describe('Authentication Controller', () => {
  describe('POST /auth/login', () => {
    test('should successfully login with valid credentials', async () => {
      // Create user with hashed password
      const { User } = require('../../backend/models');
      const hashedPassword = await User.prototype._passwordHash(mockUsers.validUser.password);
      const user = new User({
        ...mockUsers.validUser,
        password: hashedPassword
      });
      await user.save();

      const response = await AuthHelper.login(mockUsers.validUser);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toHaveProperty('username', mockUsers.validUser.username);
      expect(response.body.user).toHaveProperty('email', mockUsers.validUser.email);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    test('should fail login with invalid credentials', async () => {
      const response = await AuthHelper.login({
        username: 'nonexistent',
        password: 'wrongpassword'
      });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    test('should fail login with missing username', async () => {
      const response = await AuthHelper.login({
        password: 'ValidPassword123!'
      });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Username and password are required');
    });

    test('should fail login with missing password', async () => {
      const response = await AuthHelper.login({
        username: 'testuser'
      });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Username and password are required');
    });

    test('should fail login with SQL injection attempt', async () => {
      const maliciousInput = SecurityHelper.generateMaliciousInput().sqlInjection;
      const response = await AuthHelper.login({
        username: maliciousInput,
        password: 'ValidPassword123!'
      });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should fail login with XSS attempt', async () => {
      const maliciousInput = SecurityHelper.generateMaliciousInput().xss;
      const response = await AuthHelper.login({
        username: maliciousInput,
        password: 'ValidPassword123!'
      });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/validate', () => {
    test('should validate valid token', async () => {
      // Create user and login
      const { User } = require('../../backend/models');
      const hashedPassword = await User.prototype._passwordHash(mockUsers.validUser.password);
      const user = new User({
        ...mockUsers.validUser,
        password: hashedPassword
      });
      await user.save();

      const loginResponse = await AuthHelper.loginSuccessfully(mockUsers.validUser);
      const token = loginResponse.token;
      
      const response = await AuthHelper.validateToken(token);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token is valid');
      expect(response.body.user).toHaveProperty('username', mockUsers.validUser.username);
    });

    test('should fail validation with invalid token', async () => {
      const response = await AuthHelper.validateToken('invalid.token');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired token');
    });

    test('should fail validation with expired token', async () => {
      const expiredToken = mockTokens.expiredAccessToken();
      const response = await AuthHelper.validateToken(expiredToken);
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/logout', () => {
    test('should successfully logout with valid token', async () => {
      // Create user and login
      const { User } = require('../../backend/models');
      const hashedPassword = await User.prototype._passwordHash(mockUsers.validUser.password);
      const user = new User({
        ...mockUsers.validUser,
        password: hashedPassword
      });
      await user.save();

      const loginResponse = await AuthHelper.loginSuccessfully(mockUsers.validUser);
      const token = loginResponse.token;
      
      const response = await AuthHelper.logout(token);
      
      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully logged out');
    });

    test('should handle logout with invalid token', async () => {
      const response = await AuthHelper.logout('invalid.token');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    test('should successfully refresh access token', async () => {
      // Create user and login
      const { User } = require('../../backend/models');
      const hashedPassword = await User.prototype._passwordHash(mockUsers.validUser.password);
      const user = new User({
        ...mockUsers.validUser,
        password: hashedPassword
      });
      await user.save();

      const loginResponse = await AuthHelper.loginSuccessfully(mockUsers.validUser);
      const refreshToken = loginResponse.refreshToken;
      
      const response = await AuthHelper.refreshToken(refreshToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body).toHaveProperty('accessToken');
    });

    test('should fail refresh with invalid refresh token', async () => {
      const response = await AuthHelper.refreshToken('invalid.refresh.token');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
    });
  });

  describe('POST /auth/change-password', () => {
    test('should successfully change password with valid current password', async () => {
      // Create user and login
      const { User } = require('../../backend/models');
      const hashedPassword = await User.prototype._passwordHash(mockUsers.validUser.password);
      const user = new User({
        ...mockUsers.validUser,
        password: hashedPassword
      });
      await user.save();

      const loginResponse = await AuthHelper.loginSuccessfully(mockUsers.validUser);
      const token = loginResponse.token;
      
      const response = await AuthHelper.changePassword(token, {
        currentPassword: mockUsers.validUser.password,
        newPassword: 'NewPassword123!'
      });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password updated successfully');
    });

    test('should fail to change password with invalid current password', async () => {
      // Create user and login
      const { User } = require('../../backend/models');
      const hashedPassword = await User.prototype._passwordHash(mockUsers.validUser.password);
      const user = new User({
        ...mockUsers.validUser,
        password: hashedPassword
      });
      await user.save();

      const loginResponse = await AuthHelper.loginSuccessfully(mockUsers.validUser);
      const token = loginResponse.token;
      
      const response = await AuthHelper.changePassword(token, {
        currentPassword: 'wrongpassword',
        newPassword: 'NewPassword123!'
      });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Current password is incorrect');
    });

    test('should fail to change password with reused password', async () => {
      // Create user and login
      const { User } = require('../../backend/models');
      const hashedPassword = await User.prototype._passwordHash(mockUsers.validUser.password);
      const user = new User({
        ...mockUsers.validUser,
        password: hashedPassword,
        passwordHistory: [{
          password: hashedPassword,
          createdAt: new Date()
        }]
      });
      await user.save();

      const loginResponse = await AuthHelper.loginSuccessfully(mockUsers.validUser);
      const token = loginResponse.token;
      
      const response = await AuthHelper.changePassword(token, {
        currentPassword: mockUsers.validUser.password,
        newPassword: mockUsers.validUser.password // Reusing same password
      });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('This password was previously used. Please choose a different password.');
    });

    test('should fail to change password with missing fields', async () => {
      // Create user and login
      const { User } = require('../../backend/models');
      const hashedPassword = await User.prototype._passwordHash(mockUsers.validUser.password);
      const user = new User({
        ...mockUsers.validUser,
        password: hashedPassword
      });
      await user.save();

      const loginResponse = await AuthHelper.loginSuccessfully(mockUsers.validUser);
      const token = loginResponse.token;
      
      const response = await AuthHelper.changePassword(token, {
        currentPassword: mockUsers.validUser.password
        // Missing newPassword
      });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/me', () => {
    test('should return current user information with valid token', async () => {
      // Create user and login
      const { User } = require('../../backend/models');
      const hashedPassword = await User.prototype._passwordHash(mockUsers.validUser.password);
      const user = new User({
        ...mockUsers.validUser,
        password: hashedPassword
      });
      await user.save();

      const loginResponse = await AuthHelper.loginSuccessfully(mockUsers.validUser);
      const token = loginResponse.token;
      
      const response = await AuthHelper.getCurrentUser(token);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('username', mockUsers.validUser.username);
      expect(response.body.user).toHaveProperty('email', mockUsers.validUser.email);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).toHaveProperty('createdAt');
      expect(response.body.user).toHaveProperty('updatedAt');
    });

    test('should fail to get user info with invalid token', async () => {
      const response = await AuthHelper.getCurrentUser('invalid.token');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No authenticated user found');
    });
  });

  describe('Security Response Analysis', () => {
    test('should not expose sensitive information in error responses', async () => {
      const response = await AuthHelper.login({
        username: 'nonexistent',
        password: 'wrongpassword'
      });
      
      const securityIssues = SecurityHelper.analyzeResponseForSecurity(response);
      
      // Should not expose stack traces
      expect(securityIssues).not.toContain('Stack trace exposed in response');
      
      // Should not expose database errors
      expect(securityIssues).not.toContain('Database errors exposed in response');
      
      // Should not expose internal server details
      expect(securityIssues).not.toContain('Internal server details exposed');
    });

    test('should handle malicious input gracefully', async () => {
      const maliciousInputs = [
        SecurityHelper.generateMaliciousInput().sqlInjection,
        SecurityHelper.generateMaliciousInput().xss,
        SecurityHelper.generateMaliciousInput().commandInjection
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await AuthHelper.login({
          username: maliciousInput,
          password: 'ValidPassword123!'
        });
        
        // Should not crash the server
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        
        // Should not expose sensitive information
        const securityIssues = SecurityHelper.analyzeResponseForSecurity(response);
        expect(securityIssues).toHaveLength(0);
      }
    });
  });
});