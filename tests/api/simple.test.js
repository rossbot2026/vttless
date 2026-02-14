/**
 * Simple API Test to verify test infrastructure
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

describe('Simple API Test', () => {
  test('should return 404 for non-existent route', async () => {
    const response = await request(app).get('/nonexistent-route');
    expect(response.status).toBe(404);
  });

  test('should have health check working', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
});