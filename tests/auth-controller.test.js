/**
 * Authentication Controller Tests - Simplified Version
 * Tests all authentication endpoints and functionality
 */

const Auth = require('./backend/controllers/Auth.js');
const AuthHelper = require('./utils/authHelper.js');
const SecurityHelper = require('./utils/securityHelper.js');
const mockUsers = require('./fixtures/users.js');
const mockTokens = require('./fixtures/tokens.js');

describe('Authentication Controller', () => {
  describe('Configuration', () => {
    test('should export required functions', () => {
      expect(Auth.login).toBeDefined();
      expect(Auth.register).toBeDefined();
      expect(Auth.logout).toBeDefined();
      expect(Auth.refreshToken).toBeDefined();
      expect.AuthHelper.hashPassword).toBeDefined();
      expect.AuthHelper.comparePassword).toBeDefined();
    });
  });

  describe('Password Validation', () => {
    test('should validate password strength', () => {
      const weakPassword = '123';
      const strongPassword = 'StrongPassword123!';
      
      expect(AuthHelper.validatePassword(weakPassword)).toBe(false);
      expect(AuthHelper.validatePassword(strongPassword)).toBe(true);
    });

    test('should hash and compare passwords', () => {
      const password = 'TestPassword123!';
      
      return AuthHelper.hashPassword(password).then(hashedPassword => {
        expect(hashedPassword).not.toBe(password);
        expect(typeof hashedPassword).toBe('string');
        
        return AuthHelper.comparePassword(password, hashedPassword).then(isMatch => {
          expect(isMatch).toBe(true);
        });
      });
    });
  });

  describe('Security Validation', () => {
    test('should validate user input for security', () => {
      const validUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'StrongPassword123!'
      };
      
      const invalidUser = {
        username: '<script>alert(1)</script>',
        email: 'invalid-email',
        password: '123'
      };
      
      expect(SecurityHelper.validateUserInput(validUser)).toBe(true);
      expect(SecurityHelper.validateUserInput(invalidUser)).toBe(false);
    });

    test('should sanitize user input', () => {
      const dirtyInput = '<script>alert(1)</script>Hello World';
      const sanitized = SecurityHelper.sanitizeInput(dirtyInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello World');
    });
  });

  describe('Token Management', () => {
    test('should validate access token', () => {
      const validToken = mockTokens.validAccessToken;
      const invalidToken = 'invalid.token';
      
      expect(Auth.validateAccessToken(validToken)).toBe(true);
      expect(Auth.validateAccessToken(invalidToken)).toBe(false);
    });

    test('should validate refresh token', () => {
      const validToken = mockTokens.validRefreshToken;
      const invalidToken = 'invalid.token';
      
      expect(Auth.validateRefreshToken(validToken)).toBe(true);
      expect(Auth.validateRefreshToken(invalidToken)).toBe(false);
    });
  });

  describe('Authentication Flow', () => {
    test('should handle login flow', async () => {
      const loginData = {
        username: 'testuser',
        password: 'TestPassword123!'
      };
      
      // Mock the database response
      jest.spyOn(User, 'findOne').mockResolvedValue(mockUsers.testUser);
      
      const result = await Auth.login(loginData);
      
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.user.username).toBe(loginData.username);
    });

    test('should handle registration flow', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'StrongPassword123!',
        firstName: 'New',
        lastName: 'User'
      };
      
      const result = await Auth.register(userData);
      
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.user.username).toBe(userData.username);
    });

    test('should handle logout', async () => {
      const logoutData = {
        userId: 'testuserid',
        accessToken: mockTokens.validAccessToken
      };
      
      const result = await Auth.logout(logoutData);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('logged out successfully');
    });

    test('should handle token refresh', async () => {
      const refreshData = {
        refreshToken: mockTokens.validRefreshToken
      };
      
      const result = await Auth.refreshToken(refreshData);
      
      expect(result).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid login credentials', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword'
      };
      
      jest.spyOn(User, 'findOne').mockResolvedValue(mockUsers.testUser);
      
      await expect(Auth.login(loginData)).rejects.toThrow();
    });

    test('should handle duplicate username registration', async () => {
      const userData = {
        username: 'testuser', // Same as existing user
        email: 'newuser@example.com',
        password: 'StrongPassword123!'
      };
      
      jest.spyOn(User, 'findOne').mockResolvedValue(mockUsers.testUser);
      
      await expect(Auth.register(userData)).rejects.toThrow();
    });

    test('should handle invalid refresh token', async () => {
      const refreshData = {
        refreshToken: 'invalid.refresh.token'
      };
      
      await expect(Auth.refreshToken(refreshData)).rejects.toThrow();
    });
  });

  describe('Security Middleware', () => {
    test('should authenticate user with valid token', async () => {
      const req = {
        headers: {
          authorization: `Bearer ${mockTokens.validAccessToken}`
        }
      };
      const res = {};
      const next = jest.fn();
      
      await Auth.authenticateUser(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });

    test('should reject authentication with invalid token', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid.token'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      await Auth.authenticateUser(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});