/**
 * Health Check API Tests
 * 
 * Tests the health check endpoint
 */

const { setupTestDB, teardownTestDB, getApp } = require('../utils/testHelper');

// Setup database before importing app
let request;
let app;

beforeAll(async () => {
  await setupTestDB();
  // Now import the app after database is connected
  app = getApp();
  request = require('supertest');
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Health Check API', () => {
  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'backend');
    });

    test('should have correct content type', async () => {
      const response = await request(app).get('/health');
      
      expect(response.headers['content-type']).toMatch(/json/);
    });

    test('should handle multiple concurrent requests', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(request(app).get('/health'));
      }
      
      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });
    });
  });
});