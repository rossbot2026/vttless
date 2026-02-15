/**
 * Characters API Tests
 *
 * Tests all character management endpoints
 */

const request = require('supertest');
const { setupTestDB, teardownTestDB, getApp, getModel } = require('../utils/testHelper');

let app;
let User;
let Campaign;
let Character;
let Asset;

describe('Characters API', () => {
  let authToken;
  let userId; 
  let campaignId;
  let characterId;
  let assetId; 
  
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'SecurePassword123!'
  };

  beforeAll(async () => {
    await setupTestDB();
    app = getApp();
    User = getModel('user');
    Campaign = getModel('campaign');
    Character = getModel('character');
    Asset = getModel('asset');
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({});
    await Campaign.deleteMany({});
    await Character.deleteMany({});
    await Asset.deleteMany({});
    
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
    campaignId = campaignResponse.body.campaign._id;
    
    // Create an asset for character (simplified for testing)
    const asset = new Asset({
      name: 'Test Asset',
      type: 'token',
      key: 'test/test.png',
      campaign: campaignId,
      uploadedBy: userId,
      status: 'active'
    });
    await asset.save();
    assetId = asset._id;
  });

  describe('GET /campaigns/:campaignId/characters', () => {
    test('should return characters for a campaign when authenticated', async () => {
      const response = await request(app)
        .get(`/campaigns/${campaignId}/characters`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBeTruthy();
    });

    test('should reject request without token', async () => {
      const response = await request(app).get(`/campaigns/${campaignId}/characters`);

      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent campaign', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/campaigns/${fakeId}/characters`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    test('should reject invalid campaign ID format', async () => {
      const response = await request(app)
        .get('/campaigns/invalid-id-format/characters')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /campaigns/:campaignId/characters', () => {
    test('should create a new character when authenticated', async () => {
      const characterData = {
        name: 'Test Character',
        assetId: assetId,
        level: 1,
        hitPoints: 10,
        maxHitPoints: 10,
        armorClass: 15
      };

      const response = await request(app)
        .post(`/campaigns/${campaignId}/characters`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(characterData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('name', characterData.name);
      expect(response.body.assetId.toString()).toBe(assetId.toString());
      characterId = response.body._id;
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .post(`/campaigns/${campaignId}/characters`)
        .send({ name: 'Test Character', assetId: assetId });

      expect(response.status).toBe(401);
    });

    test('should reject missing required fields', async () => {
      const response = await request(app)
        .post(`/campaigns/${campaignId}/characters`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Character' });

      expect(response.status).toBe(400);
    });

    test('should reject invalid campaign ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .post(`/campaigns/${fakeId}/characters`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Character', assetId: assetId });

      expect(response.status).toBe(404);
    });

    test('should reject invalid campaign ID format', async () => {
      const response = await request(app)
        .post('/campaigns/invalid-id-format/characters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Character', assetId: assetId });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /characters/:characterId', () => {
    beforeEach(async () => {
      // Create a character first
      const characterData = {
        name: 'Original Character',
        assetId: assetId,
        level: 1,
        hitPoints: 10,
        maxHitPoints: 10,
        armorClass: 15
      };

      const response = await request(app)
        .post(`/campaigns/${campaignId}/characters`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(characterData);
      characterId = response.body._id;
    });

    test('should update character details when authenticated', async () => {
      const updateData = {
        name: 'Updated Character Name',
        level: 2,
        hitPoints: 15
      };

      const response = await request(app)
        .patch(`/characters/${characterId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('level', updateData.level);
      expect(response.body).toHaveProperty('hitPoints', updateData.hitPoints);
    });

    test('should reject update without token', async () => {
      const response = await request(app)
        .patch(`/characters/${characterId}`)
        .send({ name: 'Updated Character' });

      expect(response.status).toBe(401);
    });

    test('should reject update with invalid character ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .patch(`/characters/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Character' });

      expect(response.status).toBe(404);
    });

    test('should reject invalid character ID format', async () => {
      const response = await request(app)
        .patch('/characters/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Character' });

      expect(response.status).toBe(400);
    });

    test('should reject update of another user\'s character', async () => {
      // Create another user
      const otherUser = {
        username: 'otheruser',
        email: 'other@example.com',
        password: 'DifferentPassword123!'
      };

      await request(app).post('/users/signup').send(otherUser);
      const otherLoginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: otherUser.email,
          password: otherUser.password
        });
      const otherToken = otherLoginResponse.body.token;

      const response = await request(app)
        .patch(`/characters/${characterId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Trying to hack' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /characters/:characterId', () => {
    beforeEach(async () => {
      // Create a character first
      const characterData = {
        name: 'Character to Delete',
        assetId: assetId,
        level: 1,
        hitPoints: 10,
        maxHitPoints: 10,
        armorClass: 15
      };

      const response = await request(app)
        .post(`/campaigns/${campaignId}/characters`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(characterData);
      characterId = response.body._id;
    });

    test('should delete character when authenticated', async () => {
      const response = await request(app)
        .delete(`/characters/${characterId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify character is actually deleted
      const deletedCharacter = await Character.findById(characterId);
      expect(deletedCharacter).toBeNull();
    });

    test('should reject delete without token', async () => {
      const response = await request(app)
        .delete(`/characters/${characterId}`);

      expect(response.status).toBe(401);
    });

    test('should reject delete with invalid character ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/characters/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    test('should reject invalid character ID format', async () => {
      const response = await request(app)
        .delete('/characters/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    test('should reject delete of another user\'s character', async () => {
      // Create another user
      const otherUser = {
        username: 'otheruser',
        email: 'other@example.com',
        password: 'DifferentPassword123!'
      };

      await request(app).post('/users/signup').send(otherUser);
      const otherLoginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: otherUser.email,
          password: otherUser.password
        });
      const otherToken = otherLoginResponse.body.token;

      const response = await request(app)
        .delete(`/characters/${characterId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });
  });
});