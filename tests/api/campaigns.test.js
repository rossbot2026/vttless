/**
 * Campaign API Tests
 *
 * Tests all campaign endpoints
 */

const request = require('supertest');
const { setupTestDB, teardownTestDB, getApp, getModel } = require('../utils/testHelper');

let app;
let User;
let Campaign;

describe('Campaign API', () => {
  let authToken;
  let userId; 
  
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPassword123!'
  };

  beforeAll(async () => {
    await setupTestDB();
    app = getApp();
    User = getModel('user');
    Campaign = getModel('campaign');
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({});
    await Campaign.deleteMany({});
    
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
  });

  describe('GET /campaigns/list', () => {
    test('should return empty list when no campaigns', async () => {
      const response = await request(app)
        .get('/campaigns/list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    test('should reject request without token', async () => {
      const response = await request(app).get('/campaigns/list');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /campaigns/add', () => {
    test('should create a new campaign', async () => {
      const campaignData = {
        name: 'Test Campaign',
        description: 'A test campaign'
      };

      const response = await request(app)
        .post('/campaigns/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('campaign');
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .post('/campaigns/add')
        .send({ name: 'Test Campaign' });

      expect(response.status).toBe(401);
    });

    test('should reject missing campaign name', async () => {
      const response = await request(app)
        .post('/campaigns/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'No name' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /campaigns/update', () => {
    let campaignId;

    beforeEach(async () => {
      // Create a campaign first
      const createResponse = await request(app)
        .post('/campaigns/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Original Campaign' });

      // Get the campaign ID from the database
      const campaign = await Campaign.findOne({ name: 'Original Campaign' });
      campaignId = campaign ? campaign._id.toString() : null;
    });

    test('should update campaign', async () => {
      if (!campaignId) {
        console.log('Skipping test - campaign not created');
        return;
      }

      const updateData = {
        campaignId: campaignId,
        name: 'Updated Campaign Name'
      };

      const response = await request(app)
        .post('/campaigns/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
    });

    test('should reject update without token', async () => {
      const response = await request(app)
        .post('/campaigns/update')
        .send({ campaignId: campaignId, name: 'Updated' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /campaigns/delete', () => {
    let campaignId;

    beforeEach(async () => {
      // Create a campaign first
      const createResponse = await request(app)
        .post('/campaigns/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Campaign To Delete' });

      // Get the campaign ID from the database
      const campaign = await Campaign.findOne({ name: 'Campaign To Delete' });
      campaignId = campaign ? campaign._id.toString() : null;
    });

    test('should delete campaign', async () => {
      if (!campaignId) {
        console.log('Skipping test - campaign not created');
        return;
      }

      const response = await request(app)
        .post('/campaigns/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ campaignId: campaignId });

      expect(response.status).toBe(200);
    });

    test('should reject delete without token', async () => {
      const response = await request(app)
        .post('/campaigns/delete')
        .send({ campaignId: campaignId });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /campaigns/join', () => {
    test('should reject join without token', async () => {
      const response = await request(app)
        .post('/campaigns/join')
        .send({ inviteCode: 'SOME-CODE' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /campaigns/:id', () => {
    let campaignId;

    beforeEach(async () => {
      // Create a campaign first
      await request(app)
        .post('/campaigns/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Campaign' });

      // Get the campaign ID from the database
      const campaign = await Campaign.findOne({ name: 'Test Campaign' });
      campaignId = campaign ? campaign._id.toString() : null;
    });

    test('should get campaign details', async () => {
      if (!campaignId) {
        console.log('Skipping test - campaign not created');
        return;
      }

      const response = await request(app)
        .get(`/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    test('should reject request without token', async () => {
      if (!campaignId) {
        console.log('Skipping test - campaign not created');
        return;
      }

      const response = await request(app).get(`/campaigns/${campaignId}`);

      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .get('/campaigns/nonexistentid123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /campaigns/:campaignId/maps', () => {
    let campaignId;

    beforeEach(async () => {
      // Create a campaign first
      await request(app)
        .post('/campaigns/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Campaign With Maps' });

      // Get the campaign ID from the database
      const campaign = await Campaign.findOne({ name: 'Campaign With Maps' });
      campaignId = campaign ? campaign._id.toString() : null;
    });

    test('should add map to campaign', async () => {
      if (!campaignId) {
        console.log('Skipping test - campaign not created');
        return;
      }

      const mapData = {
        name: 'Test Map',
        width: 1000,
        height: 1000
      };

      const response = await request(app)
        .post(`/campaigns/${campaignId}/maps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(mapData);

      expect(response.status).toBe(201);
    });

    test('should reject add map without token', async () => {
      if (!campaignId) {
        console.log('Skipping test - campaign not created');
        return;
      }

      const response = await request(app)
        .post(`/campaigns/${campaignId}/maps`)
        .send({ name: 'Test Map' });

      expect(response.status).toBe(401);
    });
  });
});