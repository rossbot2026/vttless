/**
 * Authentication API Tests
 */

const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let mongoose;
let app;
let request;
let User;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET_KEY = 'test-jwt-secret-key';
  process.env.JWT_REFRESH_SECRET_KEY = 'test-jwt-refresh-secret-key';
  
  app = require('../../backend/index');
  request = require('supertest');
  mongoose = require('mongoose');
  User = require('../../backend/models/user');
  
  await new Promise(resolve => setTimeout(resolve, 100));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
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
    beforeEach(async () => {
      await request(app).post('/users/signup').send(testUser);
    });

    test('should handle forgot password request', async () => {
      const response = await request(app).post('/auth/forgot-password').send({ email: testUser.email });
      expect(response.status).toBe(200);
    });

    test('should handle non-existent email gracefully', async () => {
      const response = await request(app).post('/auth/forgot-password').send({ email: 'nonexistent@example.com' });
      expect(response.status).toBe(200);
    });

    test('should reject invalid email format', async () => {
      const response = await request(app).post('/auth/forgot-password').send({ email: 'invalid-email-format' });
      expect(response.status).toBe(400);
    });
  });
});
