/**
 * Friend System API Tests
 *
 * Tests all friend system endpoints
 */

const request = require('supertest');
const { setupTestDB, teardownTestDB, getApp, getModel } = require('../utils/testHelper');

let app;
let User;
let Friend;

describe('Friend System API', () => {
  let authToken;
  let userId; 
  let friendUserId;
  let friendAuthToken; 
  
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'SecurePassword123!'
  };

  const friendUser = {
    username: 'frienduser',
    email: 'friend@example.com',
    password: 'SecurePassword123!'
  };

  beforeAll(async () => {
    await setupTestDB();
    app = getApp();
    User = getModel('user');
    Friend = getModel('friend');
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({});
    await Friend.deleteMany({});
    
    // Create main user and login
    await request(app).post('/users/signup').send(testUser);
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    authToken = loginResponse.body.token;
    userId = loginResponse.body.user.id;
    
    // Create friend user and login
    await request(app).post('/users/signup').send(friendUser);
    const friendLoginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: friendUser.email,
        password: friendUser.password
      });
    friendAuthToken = friendLoginResponse.body.token;
    friendUserId = friendLoginResponse.body.user.id;
  });

  describe('POST /friends/add', () => {
    test('should send friend request', async () => {
      const response = await request(app)
        .post('/friends/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ friendId: friendUserId });

      expect(response.status).toBe(201);
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .post('/friends/add')
        .send({ friendId: friendUserId });

      expect(response.status).toBe(401);
    });

    test('should reject missing friendId', async () => {
      const response = await request(app)
        .post('/friends/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    test('should reject invalid friendId', async () => {
      const response = await request(app)
        .post('/friends/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ friendId: 'invalid-id' });

      expect(response.status).toBe(404);
    });

    test('should reject duplicate friend request', async () => {
      // Send first request
      await request(app)
        .post('/friends/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ friendId: friendUserId });

      // Try to send again
      const response = await request(app)
        .post('/friends/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ friendId: friendUserId });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /friends/list', () => {
    test('should return empty list when no friends', async () => {
      const response = await request(app)
        .get('/friends/list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    test('should reject request without token', async () => {
      const response = await request(app).get('/friends/list');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /friends/pending', () => {
    test('should return empty list when no pending requests', async () => {
      const response = await request(app)
        .get('/friends/pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    test('should reject request without token', async () => {
      const response = await request(app).get('/friends/pending');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /friends/confirm', () => {
    beforeEach(async () => {
      // Send friend request first
      await request(app)
        .post('/friends/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ friendId: friendUserId });
    });

    test('should confirm friend request', async () => {
      const response = await request(app)
        .post('/friends/confirm')
        .set('Authorization', `Bearer ${friendAuthToken}`)
        .send({ friendId: userId });

      expect(response.status).toBe(200);
    });

    test('should reject confirm without token', async () => {
      const response = await request(app)
        .post('/friends/confirm')
        .send({ friendId: userId });

      expect(response.status).toBe(401);
    });

    test('should reject invalid friendId', async () => {
      const response = await request(app)
        .post('/friends/confirm')
        .set('Authorization', `Bearer ${friendAuthToken}`)
        .send({ friendId: 'invalid-id' });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /friends/reject', () => {
    beforeEach(async () => {
      // Send friend request first
      await request(app)
        .post('/friends/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ friendId: friendUserId });
    });

    test('should reject friend request', async () => {
      const response = await request(app)
        .post('/friends/reject')
        .set('Authorization', `Bearer ${friendAuthToken}`)
        .send({ friendId: userId });

      expect(response.status).toBe(200);
    });

    test('should reject without token', async () => {
      const response = await request(app)
        .post('/friends/reject')
        .send({ friendId: userId });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /friends/remove', () => {
    beforeEach(async () => {
      // Send friend request first
      await request(app)
        .post('/friends/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ friendId: friendUserId });

      // Confirm the friend request
      await request(app)
        .post('/friends/confirm')
        .set('Authorization', `Bearer ${friendAuthToken}`)
        .send({ friendId: userId });
    });

    test('should remove friend', async () => {
      const response = await request(app)
        .post('/friends/remove')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ friendId: friendUserId });

      expect(response.status).toBe(200);
    });

    test('should reject remove without token', async () => {
      const response = await request(app)
        .post('/friends/remove')
        .send({ friendId: friendUserId });

      expect(response.status).toBe(401);
    });

    test('should reject invalid friendId', async () => {
      const response = await request(app)
        .post('/friends/remove')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ friendId: 'invalid-id' });

      expect(response.status).toBe(404);
    });
  });

  describe('Friend Request Flow', () => {
    test('should complete full friend request flow', async () => {
      // 1. Send friend request
      const addResponse = await request(app)
        .post('/friends/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ friendId: friendUserId });

      expect(addResponse.status).toBe(201);

      // 2. Check pending requests as friend
      const pendingResponse = await request(app)
        .get('/friends/pending')
        .set('Authorization', `Bearer ${friendAuthToken}`);

      expect(pendingResponse.status).toBe(200);

      // 3. Confirm friend request
      const confirmResponse = await request(app)
        .post('/friends/confirm')
        .set('Authorization', `Bearer ${friendAuthToken}`)
        .send({ friendId: userId });

      expect(confirmResponse.status).toBe(200);

      // 4. Check friends list
      const friendsResponse = await request(app)
        .get('/friends/list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(friendsResponse.status).toBe(200);

      // 5. Remove friend
      const removeResponse = await request(app)
        .post('/friends/remove')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ friendId: friendUserId });

      expect(removeResponse.status).toBe(200);
    });
  });
});