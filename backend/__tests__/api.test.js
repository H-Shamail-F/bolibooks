const request = require('supertest');
const app = require('../src/server');
const { sequelize, initializeDatabase } = require('../src/database');

describe('BoliBooks API Tests', () => {
  jest.setTimeout(30000); // 30 second timeout

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.FORCE_DB_SYNC = 'true'; // Force table recreation for clean tests
    
    // Initialize database with associations and sync
    await initializeDatabase();
  });

  afterAll(async () => {
    // Close database connection after tests
    await sequelize.close();
  });

  describe('Health Check', () => {
    test('GET /api/health should return status OK', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('message', 'BoliBooks API is running');
    });
  });

  describe('Subscription Plans', () => {
    test('GET /api/subscriptions/plans should return plans without auth', async () => {
      // First seed the subscription plans
      const { seedSubscriptionPlans } = require('../src/database/seed-subscription-plans');
      await seedSubscriptionPlans();

      const response = await request(app)
        .get('/api/subscriptions/plans')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('plans');
      expect(Array.isArray(response.body.data.plans)).toBe(true);
      expect(response.body.data.plans.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication', () => {
    test('POST /api/auth/register should create a new company and user', async () => {
      const userData = {
        companyName: 'Test Company',
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'TestPassword123!',
        companyPhone: '+1234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User and company registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
    });

    test('POST /api/auth/login should authenticate user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
    });
  });

  describe('Protected Routes', () => {
    let authToken;
    let companyId;

    beforeAll(async () => {
      // Login to get auth token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });
      
      authToken = loginResponse.body.token;
      companyId = loginResponse.body.user.companyId;
    });

    test('GET /api/subscriptions/current should return current subscription', async () => {
      const response = await request(app)
        .get('/api/subscriptions/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('company');
    });

    test('GET /api/companies/usage-stats should return usage statistics', async () => {
      const response = await request(app)
        .get('/api/companies/usage-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('products');
    });
  });
});
