const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';
let authToken = '';
let testPaymentId = '';

// Test utilities
const logger = {
  info: (message, ...args) => console.log(`[${new Date().toISOString()}] ℹ️  ${message}`, ...args),
  error: (message, ...args) => console.error(`[${new Date().toISOString()}] ❌ ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[${new Date().toISOString()}] ⚠️  ${message}`, ...args),
  success: (message, ...args) => console.log(`[${new Date().toISOString()}] ✅ ${message}`, ...args)
};

const makeRequest = async (method, url, data = null, useAuth = true) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: useAuth && authToken ? { Authorization: `Bearer ${authToken}` } : {}
    };
    
    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      data: error.response?.data || null,
      error: error.message
    };
  }
};

// Test functions
async function testServerHealth() {
  logger.info('Testing server health...');
  const result = await makeRequest('GET', '/api/health', null, false);
  
  if (result.success && result.status === 200) {
    logger.success('Server health check passed');
    return true;
  }
  
  logger.error('Server health check failed:', result);
  return false;
}

async function authenticateUser() {
  logger.info('Authenticating test user...');
  
  const loginData = {
    email: 'admin@bolivooks.com',
    password: 'admin123'
  };
  
  const result = await makeRequest('POST', '/api/auth/login', loginData, false);
  
  if (result.success && result.data?.token) {
    authToken = result.data.token;
    logger.success('Authentication successful');
    return true;
  }
  
  logger.error('Authentication failed:', result);
  return false;
}

async function testPaymentConfiguration() {
  logger.info('Testing payment configuration...');
  const result = await makeRequest('GET', '/api/payments-enhanced/config');
  
  if (result.success) {
    logger.success('Payment configuration retrieved:', JSON.stringify(result.data, null, 2));
    return true;
  }
  
  logger.error('Payment configuration test failed:', result);
  return false;
}

async function testPayPalStatus() {
  logger.info('Testing PayPal status...');
  const result = await makeRequest('GET', '/api/paypal/status');
  
  if (result.success) {
    logger.success('PayPal status retrieved:', JSON.stringify(result.data, null, 2));
    return true;
  }
  
  logger.error('PayPal status test failed:', result);
  return false;
}

async function testStripePaymentCreation() {
  logger.info('Testing Stripe payment intent creation...');
  
  const paymentData = {
    amount: 100.00,
    currency: 'usd',
    description: 'Test payment integration'
  };
  
  const result = await makeRequest('POST', '/api/payments-enhanced/create-payment-intent', paymentData);
  
  if (result.success) {
    testPaymentId = result.data?.data?.paymentId;
    logger.success('Stripe payment intent created successfully:', result.data?.data?.paymentIntentId || 'No ID returned');
    return true;
  } else if (result.status === 503 && result.data?.message?.includes('Stripe')) {
    logger.warn('Stripe not configured (expected in test environment)');
    return true; // This is expected without Stripe credentials
  }
  
  logger.error('Stripe payment creation test failed:', result);
  return false;
}

async function testPayPalOrderCreation() {
  logger.info('Testing PayPal order creation...');
  
  const orderData = {
    amount: 50.00,
    currency: 'USD',
    description: 'Test PayPal payment integration'
  };
  
  const result = await makeRequest('POST', '/api/paypal/create-order', orderData);
  
  if (result.success) {
    logger.success('PayPal order created successfully:', result.data?.data?.orderId || 'No ID returned');
    return true;
  } else if (result.status === 503 && result.data?.message?.includes('PayPal')) {
    logger.warn('PayPal not configured (expected in test environment)');
    return true; // This is expected without PayPal credentials
  }
  
  logger.error('PayPal order creation test failed:', result);
  return false;
}

async function testSubscriptionPlansAvailability() {
  logger.info('Testing subscription plans API...');
  const result = await makeRequest('GET', '/api/subscription-plans');
  
  if (result.success) {
    logger.success(`Subscription plans retrieved: ${result.data?.data?.length || 0} plans available`);
    return true;
  }
  
  logger.error('Subscription plans test failed:', result);
  return false;
}

async function testPaymentHistory() {
  logger.info('Testing payment history retrieval...');
  const result = await makeRequest('GET', '/api/payments-enhanced/history');
  
  if (result.success) {
    logger.success(`Payment history retrieved: ${result.data?.data?.payments?.length || 0} payments found`);
    return true;
  }
  
  logger.error('Payment history test failed:', result);
  return false;
}

async function testExistingEndpoints() {
  logger.info('Testing existing core endpoints...');
  
  const endpoints = [
    { name: 'Dashboard', path: '/api/reports/dashboard' },
    { name: 'Company Profile', path: '/api/companies/profile' },
    { name: 'Products', path: '/api/products' },
    { name: 'Customers', path: '/api/customers' },
    { name: 'POS Sales', path: '/api/pos/sales' }
  ];
  
  let passedCount = 0;
  
  for (const endpoint of endpoints) {
    const result = await makeRequest('GET', endpoint.path);
    if (result.success) {
      logger.success(`${endpoint.name} endpoint working`);
      passedCount++;
    } else {
      logger.error(`${endpoint.name} endpoint failed:`, result.status, result.data?.message);
    }
  }
  
  logger.info(`Core endpoints test completed: ${passedCount}/${endpoints.length} passed`);
  return passedCount === endpoints.length;
}

// Main test runner
async function runPaymentIntegrationTests() {
  logger.info('🧪 Starting Payment Integration Tests...');
  
  const tests = [
    { name: 'Server Health Check', fn: testServerHealth },
    { name: 'User Authentication', fn: authenticateUser },
    { name: 'Payment Configuration', fn: testPaymentConfiguration },
    { name: 'PayPal Status Check', fn: testPayPalStatus },
    { name: 'Stripe Payment Creation', fn: testStripePaymentCreation },
    { name: 'PayPal Order Creation', fn: testPayPalOrderCreation },
    { name: 'Subscription Plans API', fn: testSubscriptionPlansAvailability },
    { name: 'Payment History', fn: testPaymentHistory },
    { name: 'Core Endpoints Validation', fn: testExistingEndpoints }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      logger.info(`\n--- Running: ${test.name} ---`);
      const result = await test.fn();
      
      if (result) {
        passed++;
        logger.success(`✅ ${test.name} PASSED`);
      } else {
        failed++;
        logger.error(`❌ ${test.name} FAILED`);
      }
    } catch (error) {
      failed++;
      logger.error(`💥 ${test.name} CRASHED:`, error.message);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test Summary
  logger.info('\n' + '='.repeat(60));
  logger.info('🏁 PAYMENT INTEGRATION TEST RESULTS');
  logger.info('='.repeat(60));
  logger.info(`✅ Tests Passed: ${passed}`);
  logger.info(`❌ Tests Failed: ${failed}`);
  logger.info(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    logger.success('🎉 ALL PAYMENT INTEGRATION TESTS PASSED!');
  } else {
    logger.warn(`⚠️  ${failed} tests failed. Review the issues above.`);
  }
  
  return failed === 0;
}

// Wait for server to be ready
function waitForServer(maxAttempts = 30) {
  return new Promise((resolve) => {
    let attempts = 0;
    const checkServer = async () => {
      attempts++;
      const result = await makeRequest('GET', '/api/health', null, false);
      
      if (result.success) {
        logger.success(`Server is ready after ${attempts} attempts`);
        resolve(true);
      } else if (attempts >= maxAttempts) {
        logger.error(`Server not ready after ${maxAttempts} attempts`);
        resolve(false);
      } else {
        setTimeout(checkServer, 1000);
      }
    };
    checkServer();
  });
}

// Run the tests
if (require.main === module) {
  (async () => {
    logger.info('🚀 Waiting for BoliBooks server...');
    const serverReady = await waitForServer();
    
    if (!serverReady) {
      logger.error('❌ Server is not responding. Make sure the server is running on port 5000.');
      process.exit(1);
    }
    
    const success = await runPaymentIntegrationTests();
    process.exit(success ? 0 : 1);
  })();
}

module.exports = { runPaymentIntegrationTests };
