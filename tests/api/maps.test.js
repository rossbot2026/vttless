/**
 * Maps API Tests
 * 
 * Tests all map management endpoints
 */

const request = require('supertest');
const app = require('../../backend/index');
const User = require('../../backend/models/user');
const Campaign = require('../../backend/models/campaign');
const Map = require('../../backend/models/map');

describe('Maps API', () => {
  let authToken;
  let userId;
  let campaignId;
  let mapId;
  
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPassword123!'
  };

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({});
    await Campaign.deleteMany({});
    await Map.deleteMany({});
    
    // Create user and login
    await request(app).post('/users/signup').send(testUser);
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    authToken = loginResponse.body.token;
    userId = loginResponse.body.user.id;
    
    // Create a campaign
    const campaignResponse = await request(app)
      .post('/campaigns/add')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Campaign', description: 'A test campaign' });
    campaignId = campaignResponse.body._id;
  });

  describe('GET /maps', () => {
    test('should return list of maps when authenticated', async () => {
      const response = await request(app)
        .get('/maps')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBeTruthy();
    });

    test('should reject request without token', async () => {
      const response = await request(app).get('/maps');
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST /maps', () => {
    test('should create a new map when authenticated', async () => {
      const mapData = {
        name: 'Test Map',
        campaign: campaignId,
        gridWidth: 20,
        gridHeight: 20,
        gridSize: 40
      };
      
      const response = await request(app)
        .post('/maps')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mapData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('name', mapData.name);
      expect(response.body).toHaveProperty('campaign', campaignId);
      mapId = response.body._id;
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .post('/maps')
        .send({ name: 'Test Map', campaign: campaignId });
      
      expect(response.status).toBe(401);
    });

    test('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/maps')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Map' });
      
      expect(response.status).toBe(400);
    });

    test('should reject invalid campaign ID', async () => {
      const response = await request(app)
        .post('/maps')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          name: 'Test Map',
          campaign: 'invalid-campaign-id',
          gridWidth: 20,
          gridHeight: 20
        });
      
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /maps/:id', () => {
    beforeEach(async () => {
      // Create a map first
      const mapData = {
        name: 'Original Map',
        campaign: campaignId,
        gridWidth: 20,
        gridHeight: 20,
        gridSize: 40
      };
      
      const response = await request(app)
        .post('/maps')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mapData);
      mapId = response.body._id;
    });

    test('should update map details when authenticated', async () => {
      const updateData = {
        name: 'Updated Map Name',
        gridWidth: 30
      };
      
      const response = await request(app)
        .put(`/maps/${mapId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('gridWidth', updateData.gridWidth);
    });

    test('should reject update without token', async () => {
      const response = await request(app)
        .put(`/maps/${mapId}`)
        .send({ name: 'Updated Map' });
      
      expect(response.status).toBe(401);
    });

    test('should reject update with invalid map ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .put(`/maps/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Map' });
      
      expect(response.status).toBe(404);
    });

    test('should reject invalid map ID format', async () => {
      const response = await request(app)
        .put('/maps/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Map' });
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /maps/campaign/:campaignId', () => {
    beforeEach(async () => {
      // Create a map first
      const mapData = {
        name: 'Campaign Map',
        campaign: campaignId,
        gridWidth: 20,
        gridHeight: 20,
        gridSize: 40
      };
      
      await request(app)
        .post('/maps')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mapData);
    });

    test('should return maps for a campaign when authenticated', async () => {
      const response = await request(app)
        .get(`/maps/campaign/${campaignId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should reject request without token', async () => {
      const response = await request(app).get(`/maps/campaign/${campaignId}`);
      
      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent campaign', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/maps/campaign/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
    });

    test('should reject invalid campaign ID format', async () => {
      const response = await request(app)
        .get('/maps/campaign/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /maps/:id', () => {
    beforeEach(async () => {
      // Create a map first
      const mapData = {
        name: 'Map to Delete',
        campaign: campaignId,
        gridWidth: 20,
        gridHeight: 20,
        gridSize: 40
      };
      
      const response = await request(app)
        .post('/maps')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mapData);
      mapId = response.body._id;
    });

    test('should delete map when authenticated', async () => {
      const response = await request(app)
        .delete(`/maps/${mapId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      
      // Verify map is actually deleted
      const deletedMap = await Map.findById(mapId);
      expect(deletedMap).toBeNull();
    });

    test('should reject delete without token', async () => {
      const response = await request(app)
        .delete(`/maps/${mapId}`);
      
      expect(response.status).toBe(401);
    });

    test('should reject delete with invalid map ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/maps/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
    });

    test('should reject invalid map ID format', async () => {
      const response = await request(app)
        .delete('/maps/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
    });
  });
});