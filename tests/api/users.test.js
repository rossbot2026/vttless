/**
 * User Management API Tests
 * 
 * Tests all user management endpoints and CRUD operations
 */

const { createTestRequest, testUser, adminUser, testAccessToken, adminAccessToken } = require('./setup');

describe('👥 User Management API Tests', () => {
  let api;

  beforeEach(() => {
    api = createTestRequest();
  });

  describe('GET /users/profile', () => {
    test('should return user profile with valid token', async () => {
      const response = await api.withAuth(testAccessToken).get('/users/profile');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should reject request without token', async () => {
      const response = await api.get('/users/profile');
      
      expect(response.status).toBe(401);
    });

    test('should reject invalid token', async () => {
      const response = await api.withAuth('invalid-token').get('/users/profile');
      
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /users/profile', () => {
    test('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'Updated bio information'
      };

      const response = await api.withAuth(testAccessToken)
        .put('/users/profile')
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.firstName).toBe(updateData.firstName);
      expect(response.body.user.lastName).toBe(updateData.lastName);
      expect(response.body.user.bio).toBe(updateData.bio);
    });

    test('should reject update without token', async () => {
      const response = await api.put('/users/profile').send({});
      
      expect(response.status).toBe(401);
    });

    test('should reject invalid email format', async () => {
      const updateData = {
        email: 'invalid-email'
      };

      const response = await api.withAuth(testAccessToken)
        .put('/users/profile')
        .send(updateData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /users', () => {
    test('should return users list for admin', async () => {
      const response = await api.withAuth(adminAccessToken).get('/users');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);
    });

    test('should reject access for non-admin users', async () => {
      const response = await api.withAuth(testAccessToken).get('/users');
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject request without token', async () => {
      const response = await api.get('/users');
      
      expect(response.status).toBe(401);
    });

    test('should support pagination', async () => {
      const response = await api.withAuth(adminAccessToken)
        .get('/users?page=1&limit=10');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });

    test('should support search by username', async () => {
      const response = await api.withAuth(adminAccessToken)
        .get(`/users?search=${testUser.username}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body.users.length).toBeGreaterThan(0);
    });
  });

  describe('GET /users/:id', () => {
    test('should return specific user for admin', async () => {
      // First get all users to find the test user ID
      const usersResponse = await api.withAuth(adminAccessToken).get('/users');
      const userId = usersResponse.body.users.find(u => u.username === testUser.username)._id;
      
      const response = await api.withAuth(adminAccessToken).get(`/users/${userId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(testUser.username);
    });

    test('should reject access for non-admin users', async () => {
      const response = await api.withAuth(testAccessToken).get('/users/123');
      
      expect(response.status).toBe(403);
    });

    test('should return 404 for non-existent user', async () => {
      const response = await api.withAuth(adminAccessToken).get('/users/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /users/:id', () => {
    test('should update user for admin', async () => {
      // First get all users to find the test user ID
      const usersResponse = await api.withAuth(adminAccessToken).get('/users');
      const userId = usersResponse.body.users.find(u => u.username === testUser.username)._id;
      
      const updateData = {
        firstName: 'Admin',
        lastName: 'Updated'
      };

      const response = await api.withAuth(adminAccessToken)
        .put(`/users/${userId}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.firstName).toBe(updateData.firstName);
    });

    test('should reject self-update for non-admin', async () => {
      const response = await api.withAuth(testAccessToken)
        .put('/users/123')
        .send({ firstName: 'Updated' });
      
      expect(response.status).toBe(403);
    });

    test('should reject update without admin privileges', async () => {
      const response = await api.withAuth(testAccessToken)
        .put('/users/456')
        .send({ firstName: 'Updated' });
      
      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /users/:id', () => {
    test('should delete user for admin', async () => {
      // First get all users to find the test user ID
      const usersResponse = await api.withAuth(adminAccessToken).get('/users');
      const userId = usersResponse.body.users.find(u => u.username === testUser.username)._id;
      
      const response = await api.withAuth(adminAccessToken).delete(`/users/${userId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject self-delete', async () => {
      const response = await api.withAuth(testAccessToken).delete('/users/123');
      
      expect(response.status).toBe(403);
    });

    test('should reject delete without admin privileges', async () => {
      const response = await api.withAuth(testAccessToken).delete('/users/456');
      
      expect(response.status).toBe(403);
    });

    test('should return 404 for non-existent user', async () => {
      const response = await api.withAuth(adminAccessToken).delete('/users/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('User Statistics', () => {
    test('should return user statistics for admin', async () => {
      const response = await api.withAuth(adminAccessToken).get('/users/stats');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('activeUsers');
      expect(response.body).toHaveProperty('newUsersThisMonth');
      expect(typeof response.body.totalUsers).toBe('number');
    });

    test('should reject statistics access for non-admin users', async () => {
      const response = await api.withAuth(testAccessToken).get('/users/stats');
      
      expect(response.status).toBe(403);
    });

    test('should reject statistics request without token', async () => {
      const response = await api.get('/users/stats');
      
      expect(response.status).toBe(401);
    });
  });

  describe('User Activity', () => {
    test('should return user activity for admin', async () => {
      const response = await api.withAuth(adminAccessToken).get('/users/activity');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activities');
      expect(Array.isArray(response.body.activities)).toBe(true);
    });

    test('should reject activity access for non-admin users', async () => {
      const response = await api.withAuth(testAccessToken).get('/users/activity');
      
      expect(response.status).toBe(403);
    });

    test('should support date filtering', async () => {
      const response = await api.withAuth(adminAccessToken)
        .get('/users/activity?startDate=2023-01-01&endDate=2023-12-31');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activities');
    });
  });
});