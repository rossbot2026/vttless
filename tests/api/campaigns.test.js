/**
 * Campaign Management API Tests
 * 
 * Tests all campaign endpoints and game management functionality
 */

const { createTestRequest, testUser, adminUser, testAccessToken, adminAccessToken } = require('./setup');

describe('🎮 Campaign Management API Tests', () => {
  let api;

  beforeEach(() => {
    api = createTestRequest();
  });

  describe('POST /campaigns', () => {
    test('should create new campaign', async () => {
      const campaignData = {
        name: 'Test Campaign',
        description: 'A test campaign for API testing',
        gameMaster: testUser.username,
        system: 'D&D 5e',
        settings: {
          difficulty: 'medium',
          tone: 'serious'
        }
      };

      const response = await api.withAuth(testAccessToken)
        .post('/campaigns')
        .send(campaignData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('campaign');
      expect(response.body.campaign.name).toBe(campaignData.name);
      expect(response.body.campaign.gameMaster).toBe(testUser.username);
      expect(response.body.campaign).toHaveProperty('_id');
    });

    test('should reject campaign creation without token', async () => {
      const response = await api.post('/campaigns').send({});
      
      expect(response.status).toBe(401);
    });

    test('should reject invalid campaign data', async () => {
      const campaignData = {
        // Missing required fields
        description: 'Incomplete campaign data'
      };

      const response = await api.withAuth(testAccessToken)
        .post('/campaigns')
        .send(campaignData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should enforce valid game system', async () => {
      const campaignData = {
        name: 'Invalid System Campaign',
        description: 'Campaign with invalid system',
        gameMaster: testUser.username,
        system: 'Invalid System'
      };

      const response = await api.withAuth(testAccessToken)
        .post('/campaigns')
        .send(campaignData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /campaigns', () => {
    test('should return campaigns list', async () => {
      const response = await api.get('/campaigns');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('campaigns');
      expect(Array.isArray(response.body.campaigns)).toBe(true);
    });

    test('should support pagination', async () => {
      const response = await api.get('/campaigns?page=1&limit=5');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('campaigns');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 5);
    });

    test('should support search by name', async () => {
      const response = await api.get('/campaigns?search=test');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('campaigns');
    });

    test('should support filtering by game system', async () => {
      const response = await api.get('/campaigns?system=D&D 5e');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('campaigns');
    });

    test('should support filtering by game master', async () => {
      const response = await api.get(`/campaigns?gameMaster=${testUser.username}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('campaigns');
    });
  });

  describe('GET /campaigns/:id', () => {
    test('should return specific campaign', async () => {
      // First create a campaign to get its ID
      const campaignData = {
        name: 'Test Campaign for Get',
        description: 'Test campaign for getting by ID',
        gameMaster: testUser.username,
        system: 'D&D 5e'
      };

      const createResponse = await api.withAuth(testAccessToken)
        .post('/campaigns')
        .send(campaignData);
      
      const campaignId = createResponse.body.campaign._id;
      
      const response = await api.get(`/campaigns/${campaignId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('campaign');
      expect(response.body.campaign._id).toBe(campaignId);
      expect(response.body.campaign.name).toBe(campaignData.name);
    });

    test('should return 404 for non-existent campaign', async () => {
      const response = await api.get('/campaigns/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /campaigns/:id', () => {
    test('should update campaign', async () => {
      // First create a campaign
      const campaignData = {
        name: 'Original Campaign',
        description: 'Original description',
        gameMaster: testUser.username,
        system: 'D&D 5e'
      };

      const createResponse = await api.withAuth(testAccessToken)
        .post('/campaigns')
        .send(campaignData);
      
      const campaignId = createResponse.body.campaign._id;
      
      const updateData = {
        name: 'Updated Campaign',
        description: 'Updated description'
      };

      const response = await api.withAuth(testAccessToken)
        .put(`/campaigns/${campaignId}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('campaign');
      expect(response.body.campaign.name).toBe(updateData.name);
      expect(response.body.campaign.description).toBe(updateData.description);
    });

    test('should reject update without ownership', async () => {
      // Create a campaign as admin first
      const campaignData = {
        name: 'Admin Campaign',
        description: 'Campaign owned by admin',
        gameMaster: adminUser.username,
        system: 'D&D 5e'
      };

      const createResponse = await api.withAuth(adminAccessToken)
        .post('/campaigns')
        .send(campaignData);
      
      const campaignId = createResponse.body.campaign._id;
      
      const response = await api.withAuth(testAccessToken)
        .put(`/campaigns/${campaignId}`)
        .send({ name: 'Hacked Campaign' });
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject update for non-existent campaign', async () => {
      const response = await api.withAuth(testAccessToken)
        .put('/campaigns/nonexistent')
        .send({ name: 'Updated' });
      
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /campaigns/:id', () => {
    test('should delete campaign', async () => {
      // First create a campaign
      const campaignData = {
        name: 'Campaign to Delete',
        description: 'This campaign will be deleted',
        gameMaster: testUser.username,
        system: 'D&D 5e'
      };

      const createResponse = await api.withAuth(testAccessToken)
        .post('/campaigns')
        .send(campaignData);
      
      const campaignId = createResponse.body.campaign._id;
      
      const response = await api.withAuth(testAccessToken)
        .delete(`/campaigns/${campaignId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should reject delete without ownership', async () => {
      // Create a campaign as admin first
      const campaignData = {
        name: 'Admin Campaign to Delete',
        description: 'Campaign owned by admin',
        gameMaster: adminUser.username,
        system: 'D&D 5e'
      };

      const createResponse = await api.withAuth(adminAccessToken)
        .post('/campaigns')
        .send(campaignData);
      
      const campaignId = createResponse.body.campaign._id;
      
      const response = await api.withAuth(testAccessToken)
        .delete(`/campaigns/${campaignId}`);
      
      expect(response.status).toBe(403);
    });

    test('should return 404 for non-existent campaign', async () => {
      const response = await api.withAuth(testAccessToken)
        .delete('/campaigns/nonexistent');
      
      expect(response.status).toBe(404);
    });
  });

  describe('Campaign Members', () => {
    test('should add member to campaign', async () => {
      // Create a campaign first
      const campaignData = {
        name: 'Campaign with Members',
        description: 'Test campaign for member management',
        gameMaster: testUser.username,
        system: 'D&D 5e'
      };

      const createResponse = await api.withAuth(testAccessToken)
        .post('/campaigns')
        .send(campaignData);
      
      const campaignId = createResponse.body.campaign._id;
      
      const memberData = {
        username: 'newmember',
        role: 'player'
      };

      const response = await api.withAuth(testAccessToken)
        .post(`/campaigns/${campaignId}/members`)
        .send(memberData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('member');
      expect(response.body.member.username).toBe(memberData.username);
    });

    test('should remove member from campaign', async () => {
      // Create campaign and add member first
      const campaignData = {
        name: 'Campaign for Member Removal',
        description: 'Test campaign for removing members',
        gameMaster: testUser.username,
        system: 'D&D 5e'
      };

      const createResponse = await api.withAuth(testAccessToken)
        .post('/campaigns')
        .send(campaignData);
      
      const campaignId = createResponse.body.campaign._id;
      
      // Add a member
      await api.withAuth(testAccessToken)
        .post(`/campaigns/${campaignId}/members`)
        .send({ username: 'memberToRemove', role: 'player' });
      
      // Remove the member
      const response = await api.withAuth(testAccessToken)
        .delete(`/campaigns/${campaignId}/members/memberToRemove`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Campaign Statistics', () => {
    test('should return campaign statistics', async () => {
      const response = await api.get('/campaigns/stats');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalCampaigns');
      expect(response.body).toHaveProperty('activeCampaigns');
      expect(response.body).toHaveProperty('totalPlayers');
      expect(typeof response.body.totalCampaigns).toBe('number');
    });

    test('should return campaign activity', async () => {
      const response = await api.get('/campaigns/activity');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activities');
      expect(Array.isArray(response.body.activities)).toBe(true);
    });
  });
});