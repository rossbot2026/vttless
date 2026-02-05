/**
 * Authentication API Tests
 * 
 * Tests all authentication endpoints and security features
 */

const { createTestRequest, testUser, adminUser, testAccessToken, adminAccessToken } = require('./setup');

describe('🔐 Authentication API Tests', () => {
  let api;

  beforeEach(() => {
    api = createTestRequest();
  });

  describe('POST /auth/login', () => {
    test('should login with valid credentials', async () => {
      const loginData = {
        username: testUser.username,
        password: testUser.password
      };

      const response = await api.post('/auth/login').send(loginData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    test('should reject invalid password', async () => {
      const loginData = {
        username: testUser.username,
        password: 'wrongpassword'
      };

      const response = await api.post('/auth/login').send(loginData);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    test('should reject non-existent user', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'password123'
      };

      const response = await api.post('/auth/login').send(loginData);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    test('should reject empty credentials', async () => {
      const response = await api.post('/auth/login').send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject missing username', async () => {
      const loginData = {
        password: testUser.password
      };

      const response = await api.post('/auth/login').send(loginData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject missing password', async () => {
      const loginData = {
        username: testUser.username
      };

      const response = await api.post('/auth/login').send(loginData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/register', () => {
    test('should register new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'NewPassword123!',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await api.post('/auth/register').send(userData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should reject duplicate username', async () => {
      const userData = {
        username: testUser.username,
        email: 'different@example.com',
        password: 'DifferentPassword123!',
        firstName: 'Different',
        lastName: 'User'
      };

      const response = await api.post('/auth/register').send(userData);
      
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'Username already exists');
    });

    test('should reject duplicate email', async () => {
      const userData = {
        username: 'differentuser',
        email: testUser.email,
        password: 'DifferentPassword123!',
        firstName: 'Different',
        lastName: 'User'
      };

      const response = await api.post('/auth/register').send(userData);
      
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'Email already exists');
    });

    test('should reject weak password', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'weak',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await api.post('/auth/register').send(userData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject invalid email format', async () => {
      const userData = {
        username: 'newuser',
        email: 'invalid-email',
        password: 'ValidPassword123!',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await api.post('/auth/register').send(userData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should require all required fields', async () => {
      const response = await api.post('/auth/register').send({
        username: 'newuser'
      });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/logout', () => {
    test('should logout successfully with valid token', async () => {
      const response = await api.withAuth(testAccessToken)
        .post('/auth/logout')
        .send({ refreshToken: testRefreshToken });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject logout without token', async () => {
      const response = await api.post('/auth/logout').send({});
      
      expect(response.status).toBe(401);
    });

    test('should reject invalid token', async () => {
      const response = await api.withAuth('invalid-token')
        .post('/auth/logout')
        .send({ refreshToken: testRefreshToken });
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    test('should refresh token successfully', async () => {
      const refreshData = {
        refreshToken: testRefreshToken
      };

      const response = await api.post('/auth/refresh').send(refreshData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    test('should reject invalid refresh token', async () => {
      const refreshData = {
        refreshToken: 'invalid-refresh-token'
      };

      const response = await api.post('/auth/refresh').send(refreshData);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject missing refresh token', async () => {
      const response = await api.post('/auth/refresh').send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /auth/me', () => {
    test('should return current user with valid token', async () => {
      const response = await api.withAuth(testAccessToken).get('/auth/me');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should reject request without token', async () => {
      const response = await api.get('/auth/me');
      
      expect(response.status).toBe(401);
    });

    test('should reject invalid token', async () => {
      const response = await api.withAuth('invalid-token').get('/auth/me');
      
      expect(response.status).toBe(401);
    });
  });

  describe('Password Change Endpoints', () => {
    test('should change password successfully', async () => {
      const changePasswordData = {
        currentPassword: testUser.password,
        newPassword: 'NewSecurePassword123!'
      };

      const response = await api.withAuth(testAccessToken)
        .post('/auth/change-password')
        .send(changePasswordData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should reject wrong current password', async () => {
      const changePasswordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'NewSecurePassword123!'
      };

      const response = await api.withAuth(testAccessToken)
        .post('/auth/change-password')
        .send(changePasswordData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject weak new password', async () => {
      const changePasswordData = {
        currentPassword: testUser.password,
        newPassword: 'weak'
      };

      const response = await api.withAuth(testAccessToken)
        .post('/auth/change-password')
        .send(changePasswordData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});