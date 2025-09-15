// BoliBooks Full Application Test Suite
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001/api';
const FRONTEND_BASE = 'http://localhost:3000';

let authToken = '';
let testCompanyId = '';
let testUserId = '';
let testProductId = '';
let testCustomerId = '';
let testInvoiceId = '';

class FullAppTester {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async test(name, testFn) {
    try {
      console.log(`🧪 ${name}...`);
      await testFn();
      console.log(`✅ ${name} - PASSED`);
      this.passed++;
      this.tests.push({ name, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ ${name} - FAILED`);
      console.log(`   Error: ${error.message}`);
      this.failed++;
      this.tests.push({ name, status: 'FAILED', error: error.message });
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 FULL APPLICATION TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    
    if (this.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.tests.filter(t => t.status === 'FAILED').forEach(test => {
        console.log(`   • ${test.name}: ${test.error}`);
      });
    }
    console.log('='.repeat(80));
  }
}

const tester = new FullAppTester();

async function runFullAppTests() {
  console.log('🚀 Starting BoliBooks Full Application Test Suite...\n');

  // 1. INFRASTRUCTURE TESTS
  await tester.test('Backend Server Health', async () => {
    const response = await axios.get(`${API_BASE}/health`);
    if (response.data.status !== 'OK') throw new Error('Backend unhealthy');
  });

  await tester.test('Frontend Server Accessibility', async () => {
    try {
      const response = await axios.get(FRONTEND_BASE, { timeout: 5000 });
      if (response.status !== 200) throw new Error('Frontend not accessible');
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Frontend server not running');
      }
      throw error;
    }
  });

  await tester.test('Database Connection', async () => {
    const response = await axios.get(`${API_BASE}/health`);
    if (response.data.database !== 'connected') throw new Error('Database not connected');
  });

  // 2. AUTHENTICATION TESTS
  await tester.test('User Registration', async () => {
    const testUser = {
      email: `test-${Date.now()}@test.com`,
      password: 'test123456',
      firstName: 'Test',
      lastName: 'User',
      companyName: 'Test Company'
    };
    
    try {
      await axios.post(`${API_BASE}/auth/register`, testUser);
    } catch (error) {
      // If registration fails due to existing user, that's ok for this test
      if (error.response?.status !== 400) throw error;
    }
  });

  await tester.test('User Login', async () => {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@bolivooks.com',
      password: 'admin123'
    });
    authToken = response.data.token;
    testUserId = response.data.user.id;
    testCompanyId = response.data.user.companyId;
    if (!authToken) throw new Error('No auth token received');
  });

  await tester.test('Protected Route Access', async () => {
    const response = await axios.get(`${API_BASE}/companies/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!response.data.id) throw new Error('Could not access protected route');
  });

  // 3. COMPANY MANAGEMENT TESTS
  await tester.test('Company Profile Retrieval', async () => {
    const response = await axios.get(`${API_BASE}/companies/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!response.data.name) throw new Error('Company profile missing data');
  });

  await tester.test('Company Update', async () => {
    const updateData = {
      name: 'Updated Test Company',
      email: 'updated@test.com'
    };
    await axios.put(`${API_BASE}/companies/profile`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
  });

  // 4. PRODUCT MANAGEMENT TESTS
  await tester.test('Product Creation', async () => {
    const product = {
      name: 'Test Product',
      price: 29.99,
      sku: `TEST-${Date.now()}`,
      category: 'Test Category',
      description: 'Test product description'
    };
    const response = await axios.post(`${API_BASE}/products`, product, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    testProductId = response.data.id;
    if (!testProductId) throw new Error('Product not created');
  });

  await tester.test('Product Listing', async () => {
    const response = await axios.get(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!Array.isArray(response.data)) throw new Error('Products not returned as array');
  });

  await tester.test('Product Update', async () => {
    const updateData = { name: 'Updated Test Product', price: 39.99 };
    await axios.put(`${API_BASE}/products/${testProductId}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
  });

  // 5. CUSTOMER MANAGEMENT TESTS
  await tester.test('Customer Creation', async () => {
    const customer = {
      name: 'Test Customer',
      email: `customer-${Date.now()}@test.com`,
      phone: '+1234567890'
    };
    const response = await axios.post(`${API_BASE}/customers`, customer, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    testCustomerId = response.data.id;
    if (!testCustomerId) throw new Error('Customer not created');
  });

  await tester.test('Customer Listing', async () => {
    const response = await axios.get(`${API_BASE}/customers`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!Array.isArray(response.data)) throw new Error('Customers not returned as array');
  });

  // 6. INVOICE MANAGEMENT TESTS
  await tester.test('Invoice Creation', async () => {
    const invoice = {
      customerId: testCustomerId,
      items: [{
        productId: testProductId,
        quantity: 2,
        price: 29.99
      }],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    const response = await axios.post(`${API_BASE}/invoices`, invoice, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    testInvoiceId = response.data.id;
    if (!testInvoiceId) throw new Error('Invoice not created');
  });

  await tester.test('Invoice Listing', async () => {
    const response = await axios.get(`${API_BASE}/invoices`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!Array.isArray(response.data)) throw new Error('Invoices not returned as array');
  });

  // 7. POS SYSTEM TESTS
  await tester.test('POS Products Listing', async () => {
    const response = await axios.get(`${API_BASE}/pos/products`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!Array.isArray(response.data)) throw new Error('POS products not returned as array');
  });

  await tester.test('Barcode Scanning', async () => {
    // Test with the SKU of our created product
    const product = await axios.get(`${API_BASE}/products/${testProductId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const sku = product.data.sku;
    
    const response = await axios.get(`${API_BASE}/pos/scan/${sku}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!response.data.id) throw new Error('Barcode scanning failed');
  });

  await tester.test('POS Sale Creation', async () => {
    const sale = {
      items: [{
        productId: testProductId,
        quantity: 1,
        price: 29.99
      }],
      paymentMethod: 'cash',
      total: 29.99
    };
    const response = await axios.post(`${API_BASE}/pos/sales`, sale, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!response.data.id) throw new Error('POS sale not created');
  });

  // 8. BML PAYMENT INTEGRATION TESTS
  await tester.test('BML Configuration Check', async () => {
    const response = await axios.get(`${API_BASE}/payments/bml/config`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!response.data.enabled) throw new Error('BML not enabled');
  });

  await tester.test('BML Payment Creation', async () => {
    const payment = {
      amount: 100.00,
      currency: 'MVR',
      orderId: `test-${Date.now()}`,
      description: 'Test BML Payment'
    };
    const response = await axios.post(`${API_BASE}/payments/bml/create`, payment, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!response.data.redirectUrl) throw new Error('BML payment creation failed');
  });

  // 9. REPORTING TESTS
  await tester.test('Dashboard Stats', async () => {
    const response = await axios.get(`${API_BASE}/reports/dashboard`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (typeof response.data !== 'object') throw new Error('Dashboard stats not returned');
  });

  await tester.test('Sales Report', async () => {
    const response = await axios.get(`${API_BASE}/reports/sales`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!response.data) throw new Error('Sales report not returned');
  });

  // 10. SUBSCRIPTION MANAGEMENT TESTS
  await tester.test('Subscription Plans Listing', async () => {
    const response = await axios.get(`${API_BASE}/companies/subscription-plans`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!Array.isArray(response.data)) throw new Error('Subscription plans not returned as array');
  });

  // 11. FILE UPLOAD TESTS (if uploads exist)
  await tester.test('Upload Endpoint Access', async () => {
    try {
      const response = await axios.get(`${API_BASE}/uploads/test`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    } catch (error) {
      // 404 is expected if no test file, just check it's not 500
      if (error.response?.status === 500) throw error;
    }
  });

  // 12. ERROR HANDLING TESTS
  await tester.test('Invalid Route Handling', async () => {
    try {
      await axios.get(`${API_BASE}/nonexistent-route`);
      throw new Error('Should have returned 404');
    } catch (error) {
      if (error.response?.status !== 404) throw new Error('Expected 404 error');
    }
  });

  await tester.test('Unauthorized Access Handling', async () => {
    try {
      await axios.get(`${API_BASE}/products`); // No auth header
      throw new Error('Should have returned 401');
    } catch (error) {
      if (error.response?.status !== 401) throw new Error('Expected 401 error');
    }
  });

  // 13. DATABASE INTEGRITY TESTS
  await tester.test('Data Consistency Check', async () => {
    // Verify the product we created is still there
    const response = await axios.get(`${API_BASE}/products/${testProductId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (response.data.name !== 'Updated Test Product') {
      throw new Error('Data not persisted correctly');
    }
  });

  // 14. PERFORMANCE TESTS
  await tester.test('API Response Time', async () => {
    const start = Date.now();
    await axios.get(`${API_BASE}/health`);
    const responseTime = Date.now() - start;
    if (responseTime > 5000) throw new Error(`Slow response time: ${responseTime}ms`);
  });

  // Print final summary
  tester.printSummary();

  // Return results for further processing
  return {
    passed: tester.passed,
    failed: tester.failed,
    total: tester.passed + tester.failed,
    successRate: ((tester.passed / (tester.passed + tester.failed)) * 100).toFixed(1),
    tests: tester.tests
  };
}

// Run the tests
runFullAppTests().catch(console.error);
