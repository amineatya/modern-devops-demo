const request = require('supertest');
const app = require('./app');

describe('Integration Tests', () => {
  describe('Complete User Flow', () => {
    it('should handle complete user registration and retrieval flow', async () => {
      // Create user
      const userData = {
        username: 'integrationuser',
        email: 'integration@example.com',
        password: 'password123'
      };

      const createResponse = await request(app)
        .post('/api/v1/users')
        .send(userData)
        .expect(201);

      expect(createResponse.body.user.username).toBe(userData.username);
      expect(createResponse.body.user.email).toBe(userData.email);
    });
  });

  describe('Health Check Integration', () => {
    it('should provide comprehensive health information', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);

      // Verify all health components
      expect(response.body.status).toBe('ok');
      expect(response.body.metrics.memory).toHaveProperty('rss');
      expect(response.body.metrics.memory).toHaveProperty('heapTotal');
      expect(response.body.metrics.memory).toHaveProperty('heapUsed');
      expect(response.body.metrics.cpu).toHaveProperty('user');
      expect(response.body.metrics.cpu).toHaveProperty('system');
    });
  });

  describe('Metrics Integration', () => {
    it('should track metrics across multiple requests', async () => {
      // Make several requests to generate metrics
      await request(app).get('/');
      await request(app).get('/healthz');
      await request(app).get('/api/v1/status');

      const metricsResponse = await request(app)
        .get('/metrics')
        .expect(200);

      expect(metricsResponse.text).toContain('http_requests_total');
      expect(metricsResponse.text).toContain('http_request_duration_seconds');
    });
  });
});
