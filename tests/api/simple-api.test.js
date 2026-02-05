/**
 * Simple API Tests - No Database Required
 * 
 * Tests basic API endpoints that don't require database setup
 */

const request = require('supertest');
const app = require('../../backend/index');

describe('🔧 Simple API Tests (No Database)', () => {
  
  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('backend');
    });

    test('should have correct content type', async () => {
      const response = await request(app).get('/health');
      
      expect(response.headers['content-type']).toMatch(/json/);
    });

    test('should handle multiple requests', async () => {
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

  describe('GET /api/status', () => {
    test('should return system status', async () => {
      const response = await request(app).get('/api/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /metrics', () => {
    test('should return metrics', async () => {
      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('POST /auth/login - Error Cases', () => {
    test('should reject empty body', async () => {
      const response = await request(app).post('/auth/login').send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject missing username', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ password: 'test123' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject missing password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'test' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject invalid JSON', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/register - Error Cases', () => {
    test('should reject empty body', async () => {
      const response = await request(app).post('/auth/register').send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ username: 'test' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'test',
          email: 'invalid-email',
          password: 'TestPassword123!'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'test',
          email: 'test@example.com',
          password: 'weak'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject duplicate username (case insensitive)', async () => {
      // First create a user
      await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPassword123!'
        });
      
      // Try to create with same username (different case)
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'TESTUSER',
          email: 'different@example.com',
          password: 'TestPassword123!'
        });
      
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication Middleware', () => {
    test('should protect endpoints without token', async () => {
      const response = await request(app).get('/auth/me');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject malformed token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'invalid-token-format');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject empty token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer ');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    test('should handle rate limiting on login endpoint', async () => {
      const loginData = {
        username: 'test',
        password: 'test123'
      };
      
      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(request(app).post('/auth/login').send(loginData));
      }
      
      const responses = await Promise.all(promises);
      // Some should succeed (first few), some should be rate limited
      responses.forEach(response => {
        expect([200, 400, 429]).toContain(response.status);
      });
    });
  });

  describe('CORS Headers', () => {
    test('should include CORS headers', async () => {
      const response = await request(app).get('/health');
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });

    test('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/health')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'authorization');
      
      expect(response.status).toBe(204);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 routes', async () => {
      const response = await request(app).get('/nonexistent-route');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('malformed { json');
      
      expect(response.status).toBe(400);
    });

    test('should handle invalid content type', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/xml')
        .send('<xml><username>test</username></xml>');
      
      expect(response.status).toBe(400);
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent requests', async () => {
      const startTime = Date.now();
      const promises = [];
      
      // Make 20 concurrent requests
      for (let i = 0; i < 20; i++) {
        promises.push(request(app).get('/health'));
      }
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });
    });

    test('should respond within acceptable time', async () => {
      const startTime = Date.now();
      const response = await request(app).get('/health');
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000); // Should respond in under 1 second
    });
  });
});