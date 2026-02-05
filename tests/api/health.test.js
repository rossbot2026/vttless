/**
 * Health Check API Tests
 * 
 * Tests all health check endpoints and system status
 */

const { createTestRequest } = require('./setup');

describe('🏥 Health Check API Tests', () => {
  let api;

  beforeEach(() => {
    api = createTestRequest();
  });

  describe('GET /health', () => {
    test('should return system health status', async () => {
      const response = await api.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'backend');
    });

    test('should respond with correct content type', async () => {
      const response = await api.get('/health');
      
      expect(response.headers['content-type']).toMatch(/json/);
    });

    test('should handle high load gracefully', async () => {
      // Test concurrent requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(api.get('/health'));
      }
      
      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });
    });
  });

  describe('GET /api/status', () => {
    test('should return detailed system status', async () => {
      const response = await api.get('/api/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /metrics', () => {
    test('should return system metrics', async () => {
      const response = await api.get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('uptime');
    });
  });
});