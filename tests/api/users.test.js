/**
 * Users API Tests
 *
 * Tests user management endpoints that actually exist
 */

const request = require('supertest');
const { setupTestDB, teardownTestDB, getApp, getModel } = require('../utils/testHelper');

let app;
let User;

describe('Users API', () => {
  let authToken;
  let userId; 
  
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'SecurePassword123!'
  };

  beforeAll(async () => {
    await setupTestDB();
    app = getApp();
    User = getModel('user');
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({});
    
    // Create test user and login
    await request(app).post('/users/signup').send(testUser);
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    authToken = loginResponse.body.token;
    userId = loginResponse.body.user.id;
  });

  describe('GET /auth/me', () => {
    test('should return current user details when authenticated', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('_id', userId);
      expect(response.body.user).toHaveProperty('username', testUser.username);
      expect(response.body.user).toHaveProperty('email', testUser.email);
    });

    test('should reject request without token', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /users/signup', () => {
    test('should register a new user successfully', async () => {
      const newUser = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'NewPassword123!'
      };

      const response = await request(app).post('/users/signup').send(newUser);
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', newUser.username);
      expect(response.body.user).toHaveProperty('email', newUser.email);
    });

    test('should reject duplicate username', async () => {
      const duplicateUser = { ...testUser, email: 'different@example.com' };
      const response = await request(app).post('/users/signup').send(duplicateUser);
      expect(response.status).toBe(400);
    });

    test('should reject duplicate email', async () => {
      const duplicateUser = { ...testUser, username: 'differentuser' };
      const response = await request(app).post('/users/signup').send(duplicateUser);
      expect(response.status).toBe(400);
    });

    test('should reject missing required fields', async () => {
      const response = await request(app).post('/users/signup').send({
        username: 'testuser',
        email: 'test@example.com'
        // missing password
      });
      expect(response.status).toBe(400);
    });
  });
});