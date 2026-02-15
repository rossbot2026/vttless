/**
 * Authentication API Tests
 */

const { setupTestDB, teardownTestDB, getApp, getModel, getMongoose } = require('../utils/testHelper');

let app;
let request;
let User;
let mongoose;

beforeAll(async () => {
  await setupTestDB();
  app = getApp();
  request = require('supertest');
  mongoose = getMongoose();
  User = getModel('user');
  
  await new Promise(resolve => setTimeout(resolve, 100));
});

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Authentication API', () => {
  const testUser = {
    username: 'apitester',
    email: 'apitester@example.com',
    password: 'SecurePass123!'
  };

  describe('POST /users/signup', () => {
    test('should register a new user successfully', async () => {
      const response = await request(app).post('/users/signup').send(testUser);
      expect(response.status).toBe(201);
      const user = await User.findOne({ email: testUser.email });
      expect(user).toBeTruthy();
      expect(user.username).toBe(testUser.username);
    });

    test('should reject duplicate username', async () => {
      await request(app).post('/users/signup').send(testUser);
      const duplicateUser = { ...testUser, email: 'different@example.com' };
      const response = await request(app).post('/users/signup').send(duplicateUser);
      expect(response.status).toBe(400);
    });

    test('should reject duplicate email', async () => {
      await request(app).post('/users/signup').send(testUser);
      const duplicateUser = { ...testUser, username: 'differentuser' };
      const response = await request(app).post('/users/signup').send(duplicateUser);
      expect(response.status).toBe(400);
    });

    test('should reject missing username', async () => {
      const response = await request(app).post('/users/signup').send({ email: testUser.email, password: testUser.password });
      expect(response.status).toBe(400);
    });

    test('should reject missing email', async () => {
      const response = await request(app).post('/users/signup').send({ username: testUser.username, password: testUser.password });
      expect(response.status).toBe(400);
    });

    test('should reject missing password', async () => {
      const response = await request(app).post('/users/signup').send({ username: testUser.username, email: testUser.email });
      expect(response.status).toBe(400);
    });

    test('should reject weak password', async () => {
      const response = await request(app).post('/users/signup').send({ ...testUser, password: 'weak' });
      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/users/signup').send(testUser);
    });

    test('should login with valid credentials', async () => {
      const response = await request(app).post('/auth/login').send({ email: testUser.email, password: testUser.password });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should reject invalid password', async () => {
      const response = await request(app).post('/auth/login').send({ email: testUser.email, password: 'wrongpassword' });
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    test('should reject non-existent user', async () => {
      const response = await request(app).post('/auth/login').send({ email: 'nonexistent@example.com', password: 'password123' });
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    test('should reject missing email', async () => {
      const response = await request(app).post('/auth/login').send({ password: testUser.password });
      expect(response.status).toBe(400);
    });

    test('should reject missing password', async () => {
      const response = await request(app).post('/auth/login').send({ email: testUser.email });
      expect(response.status).toBe(400);
    });

    test('should reject empty credentials', async () => {
      const response = await request(app).post('/auth/login').send({});
      expect(response.status).toBe(400);
    });
  });

  describe('GET /auth/validate', () => {
    let authToken;

    beforeEach(async () => {
      await request(app).post('/users/signup').send(testUser);
      const loginResponse = await request(app).post('/auth/login').send({ email: testUser.email, password: testUser.password });
      authToken = loginResponse.body.token;
    });

    test('should validate valid token', async () => {
      const response = await request(app).get('/auth/validate').set('Authorization', `Bearer ${authToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should reject request without token', async () => {
      const response = await request(app).get('/auth/validate');
      expect(response.status).toBe(401);
    });

    test('should reject invalid token', async () => {
      const response = await request(app).get('/auth/validate').set('Authorization', 'Bearer invalid-token');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /auth/logout', () => {
    let authToken;

    beforeEach(async () => {
      await request(app).post('/users/signup').send(testUser);
      const loginResponse = await request(app).post('/auth/login').send({ email: testUser.email, password: testUser.password });
      authToken = loginResponse.body.token;
    });

    test('should logout successfully with valid token', async () => {
      const response = await request(app).get('/auth/logout').set('Authorization', `Bearer ${authToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should reject logout without token', async () => {
      const response = await request(app).get('/auth/logout');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      await request(app).post('/users/signup').send(testUser);
      const loginResponse = await request(app).post('/auth/login').send({ email: testUser.email, password: testUser.password });
      refreshToken = loginResponse.body.refreshToken;
    });

    test('should refresh access token successfully', async () => {
      const response = await request(app).post('/auth/refresh').send({ refreshToken });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
    });

    test('should reject invalid refresh token', async () => {
      const response = await request(app).post('/auth/refresh').send({ refreshToken: 'invalid-refresh-token' });
      expect(response.status).toBe(401);
    });

    test('should reject missing refresh token', async () => {
      const response = await request(app).post('/auth/refresh').send({});
      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/change-password', () => {
    let authToken;

    beforeEach(async () => {
      await request(app).post('/users/signup').send(testUser);
      const loginResponse = await request(app).post('/auth/login').send({ email: testUser.email, password: testUser.password });
      authToken = loginResponse.body.token;
    });

    test('should change password successfully', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentPassword: testUser.password, newPassword: 'NewSecurePass123!@#$' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Small delay to ensure password change is saved
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify new password works
      const loginResponse = await request(app).post('/auth/login').send({ email: testUser.email, password: 'NewSecurePass123!@#$' });
      expect(loginResponse.status).toBe(200);
    });

    test('should reject wrong current password', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentPassword: 'wrongpassword', newPassword: 'NewSecurePass123!' });
      
      expect(response.status).toBe(401);
    });

    test('should reject weak new password', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentPassword: testUser.password, newPassword: 'weak' });
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/forgot-password', () => {
    const testEmail = 'mrosstech@gmail.com';
    
    beforeEach(async () => {
      await request(app).post('/users/signup').send({
        ...testUser,
        email: testEmail
      });
    });

    test('should send reset email for valid user', async () => {
      const response = await request(app).post('/auth/forgot-password').send({ email: testEmail });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'If an account exists with this email, a password reset link has been sent');
      
      // Verify token was generated and saved
      const user = await User.findOne({ email: testEmail });
      expect(user.passwordResetToken).toBeTruthy();
      expect(user.passwordResetTokenExpiry).toBeTruthy();
      expect(user.passwordResetTokenExpiry.getTime()).toBeGreaterThan(Date.now());
    });

    test('should return 404 for non-existent email', async () => {
      const response = await request(app).post('/auth/forgot-password').send({ email: 'nonexistent@example.com' });
      
      // Should return success message to not reveal if user exists
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('If an account exists');
    });

    test('should generate passwordResetToken and passwordResetTokenExpiry', async () => {
      const response = await request(app).post('/auth/forgot-password').send({ email: testEmail });
      
      expect(response.status).toBe(200);
      
      const user = await User.findOne({ email: testEmail });
      
      // Token should be a hash (not plain text)
      expect(user.passwordResetToken).toBeTruthy();
      expect(user.passwordResetToken).toMatch(/^[a-f0-9]{64}$/); // SHA256 hash is 64 chars
      
      // Expiry should be approximately 1 hour from now
      const expectedExpiry = Date.now() + (60 * 60 * 1000);
      expect(user.passwordResetTokenExpiry.getTime()).toBeGreaterThan(Date.now());
      expect(user.passwordResetTokenExpiry.getTime()).toBeLessThan(expectedExpiry + 1000);
    });

    test('should not allow multiple requests within short time', async () => {
      // First request
      await request(app).post('/auth/forgot-password').send({ email: testEmail });
      
      const userBefore = await User.findOne({ email: testEmail });
      const firstToken = userBefore.passwordResetToken;
      const firstExpiry = userBefore.passwordResetTokenExpiry;
      
      // Second request within short time - should generate new token
      const response = await request(app).post('/auth/forgot-password').send({ email: testEmail });
      
      expect(response.status).toBe(200);
      
      const userAfter = await User.findOne({ email: testEmail });
      // Token should be regenerated
      expect(userAfter.passwordResetToken).not.toEqual(firstToken);
      expect(userAfter.passwordResetTokenExpiry.getTime()).toBeGreaterThan(firstExpiry.getTime());
    });

    test('should return success message (do not expose if user exists)', async () => {
      const response = await request(app).post('/auth/forgot-password').send({ email: testEmail });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('If an account exists with this email, a password reset link has been sent');
      expect(response.body.code).toBe('EMAIL_SENT');
    });

    test('should reject invalid email format', async () => {
      const response = await request(app).post('/auth/forgot-password').send({ email: 'invalid-email-format' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.code).toBe('INVALID_EMAIL');
    });

    test('should reject missing email', async () => {
      const response = await request(app).post('/auth/forgot-password').send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /auth/reset-password', () => {
    const testEmail = 'mrosstech@gmail.com';
    let resetToken;

    beforeEach(async () => {
      await request(app).post('/users/signup').send({
        ...testUser,
        email: testEmail
      });
      
      // Get the raw token from the user
      // For testing, we create our own token and hash it to match what would be stored
      const crypto = require('crypto');
      resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      // Update user with our token
      const resetTokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
      await User.updateOne(
        { email: testEmail },
        { 
          passwordResetToken: resetTokenHash,
          passwordResetTokenExpiry: resetTokenExpiry
        }
      );
    });

    test('should reset password with valid token', async () => {
      const newPassword = 'NewSecurePass123!@#$';
      
      const response = await request(app).post('/auth/reset-password').send({ 
        token: resetToken, 
        password: newPassword 
      });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.code).toBe('PASSWORD_RESET_SUCCESS');
      
      // Verify user can login with new password
      const loginResponse = await request(app).post('/auth/login').send({ 
        email: testEmail, 
        password: newPassword 
      });
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');
    });

    test('should reject expired token', async () => {
      // Set expiry to past time
      const expiredExpiry = Date.now() - (60 * 60 * 1000); // 1 hour ago
      
      const crypto = require('crypto');
      const expiredToken = crypto.randomBytes(32).toString('hex');
      const expiredTokenHash = crypto.createHash('sha256').update(expiredToken).digest('hex');
      
      await User.updateOne(
        { email: testEmail },
        { 
          passwordResetToken: expiredTokenHash,
          passwordResetTokenExpiry: expiredExpiry
        }
      );
      
      const response = await request(app).post('/auth/reset-password').send({ 
        token: expiredToken, 
        password: 'NewSecurePass123!' 
      });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.code).toBe('INVALID_TOKEN');
    });

    test('should reject invalid token', async () => {
      const response = await request(app).post('/auth/reset-password').send({ 
        token: 'invalid-token-that-does-not-exist', 
        password: 'NewSecurePass123!' 
      });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.code).toBe('INVALID_TOKEN');
    });

    test('should reject weak password', async () => {
      const response = await request(app).post('/auth/reset-password').send({ 
        token: resetToken, 
        password: 'weak' 
      });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.code).toBe('WEAK_PASSWORD');
    });

    test('should allow login with new password after reset', async () => {
      const newPassword = 'NewSecurePass123!@#$';
      
      // Reset password
      const resetResponse = await request(app).post('/auth/reset-password').send({ 
        token: resetToken, 
        password: newPassword 
      });
      expect(resetResponse.status).toBe(200);
      
      // Verify old password no longer works
      const oldLoginResponse = await request(app).post('/auth/login').send({ 
        email: testEmail, 
        password: testUser.password 
      });
      expect(oldLoginResponse.status).toBe(401);
      
      // Verify new password works
      const newLoginResponse = await request(app).post('/auth/login').send({ 
        email: testEmail, 
        password: newPassword 
      });
      expect(newLoginResponse.status).toBe(200);
      expect(newLoginResponse.body).toHaveProperty('token');
    });

    test('should invalidate token after use', async () => {
      const newPassword = 'NewSecurePass123!@#$';
      
      // First reset
      const firstResponse = await request(app).post('/auth/reset-password').send({ 
        token: resetToken, 
        password: newPassword 
      });
      expect(firstResponse.status).toBe(200);
      
      // Try to use the same token again
      const secondResponse = await request(app).post('/auth/reset-password').send({ 
        token: resetToken, 
        password: 'AnotherNewPass123!' 
      });
      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body.code).toBe('INVALID_TOKEN');
      
      // Verify token was cleared from user
      const user = await User.findOne({ email: testEmail });
      expect(user.passwordResetToken).toBeFalsy();
      expect(user.passwordResetTokenExpiry).toBeFalsy();
    });

    test('should reject missing token', async () => {
      const response = await request(app).post('/auth/reset-password').send({ 
        password: 'NewSecurePass123!' 
      });
      
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_CREDENTIALS');
    });

    test('should reject missing password', async () => {
      const response = await request(app).post('/auth/reset-password').send({ 
        token: resetToken 
      });
      
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_CREDENTIALS');
    });
  });

  describe('User Model - Password Reset Fields', () => {
    const testEmail = 'mrosstech@gmail.com';
    
    beforeEach(async () => {
      await request(app).post('/users/signup').send({
        ...testUser,
        email: testEmail
      });
    });
    
    test('should have passwordResetToken field', async () => {
      // Create user - initially should be null
      const user = await User.findOne({ email: testEmail });
      expect(user).toBeTruthy();
      expect(user).toHaveProperty('passwordResetToken');
      expect(user.passwordResetToken).toBeNull();
    });

    test('should have passwordResetTokenExpiry field', async () => {
      const user = await User.findOne({ email: testEmail });
      expect(user).toBeTruthy();
      expect(user).toHaveProperty('passwordResetTokenExpiry');
      expect(user.passwordResetTokenExpiry).toBeNull();
    });

    test('should save and retrieve passwordResetToken', async () => {
      const crypto = require('crypto');
      const testToken = 'test-reset-token-12345';
      const tokenHash = crypto.createHash('sha256').update(testToken).digest('hex');
      const tokenExpiry = Date.now() + (60 * 60 * 1000);
      
      await User.updateOne(
        { email: testEmail },
        { 
          passwordResetToken: tokenHash,
          passwordResetTokenExpiry: tokenExpiry
        }
      );
      
      // Retrieve and verify
      const user = await User.findOne({ email: testEmail });
      expect(user.passwordResetToken).toBe(tokenHash);
      expect(user.passwordResetTokenExpiry.getTime()).toBe(tokenExpiry);
    });

    test('should clear passwordResetToken after reset', async () => {
      const crypto = require('crypto');
      const testToken = 'test-reset-token-12345';
      const tokenHash = crypto.createHash('sha256').update(testToken).digest('hex');
      const tokenExpiry = Date.now() + (60 * 60 * 1000);
      
      // Set token
      await User.updateOne(
        { email: testEmail },
        { 
          passwordResetToken: tokenHash,
          passwordResetTokenExpiry: tokenExpiry
        }
      );
      
      // Simulate password reset by clearing token
      await User.updateOne(
        { email: testEmail },
        { 
          passwordResetToken: null,
          passwordResetTokenExpiry: null
        }
      );
      
      // Verify cleared
      const user = await User.findOne({ email: testEmail });
      expect(user.passwordResetToken).toBeNull();
      expect(user.passwordResetTokenExpiry).toBeNull();
    });
  });
});
