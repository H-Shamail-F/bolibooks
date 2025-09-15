const axios = require('axios');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';

let authToken = '';
let backendProcess = null;
let frontendProcess = null;

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
      url: `${BACKEND_URL}${url}`,
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

const checkUrl = async (url, timeout = 30000) => {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      await axios.get(url);
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return false;
};

// Server management
const startBackendServer = () => {
  return new Promise((resolve, reject) => {
    logger.info('Starting backend server...');
    
    backendProcess = spawn('node', ['src/server-stable.js'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'pipe'
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        reject(new Error('Backend server failed to start within timeout'));
      }
    }, 30000);

    backendProcess.stdout.on('data', (data) => {
      const message = data.toString();
      if (message.includes('server running on port') && !started) {
        started = true;
        clearTimeout(timeout);
        logger.success('Backend server started successfully');
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      logger.error('Backend stderr:', data.toString());
    });

    backendProcess.on('error', (error) => {
      reject(error);
    });
  });
};

const startFrontendServer = () => {
  return new Promise((resolve, reject) => {
    logger.info('Starting frontend server...');
    
    frontendProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'pipe'
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        reject(new Error('Frontend server failed to start within timeout'));
      }
    }, 60000);

    frontendProcess.stdout.on('data', (data) => {
      const message = data.toString();
      if (message.includes('webpack compiled') || message.includes('Local:') && !started) {
        started = true;
        clearTimeout(timeout);
        logger.success('Frontend server started successfully');
        resolve();
      }
    });

    frontendProcess.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('webpack compiled') && !started) {
        started = true;
        clearTimeout(timeout);
        logger.success('Frontend server started successfully');
        resolve();
      }
    });

    frontendProcess.on('error', (error) => {
      reject(error);
    });
  });
};

const stopServers = () => {
  logger.info('Stopping servers...');
  
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  
  if (frontendProcess) {
    frontendProcess.kill();
    frontendProcess = null;
  }
};

// Test functions
async function testBackendHealth() {
  logger.info('Testing backend health...');
  const result = await makeRequest('GET', '/api/health', null, false);
  
  if (result.success && result.status === 200) {
    logger.success('Backend health check passed');
    return true;
  }
  
  logger.error('Backend health check failed:', result);
  return false;
}

async function testAuthentication() {
  logger.info('Testing user authentication...');
  
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
    const config = result.data.data;
    logger.success('Payment configuration retrieved:');
    logger.info(`  Stripe: ${config.stripe.available ? 'Available' : 'Not available'}`);
    logger.info(`  PayPal: ${config.paypal.available ? 'Available' : 'Not available'}`);
    logger.info(`  Supported methods: ${config.supportedMethods.join(', ')}`);
    logger.info(`  Currencies: ${config.currencies.join(', ')}`);
    return true;
  }
  
  logger.error('Payment configuration test failed:', result);
  return false;
}

async function testFrontendAccessibility() {
  logger.info('Testing frontend accessibility...');
  
  try {
    const response = await axios.get(FRONTEND_URL);
    if (response.status === 200) {
      logger.success('Frontend is accessible');
      return true;
    }
  } catch (error) {
    logger.error('Frontend accessibility failed:', error.message);
  }
  
  return false;
}

async function testCoreEndpoints() {
  logger.info('Testing core API endpoints...');
  
  const endpoints = [
    { name: 'Dashboard', path: '/api/reports/dashboard' },
    { name: 'Company Profile', path: '/api/companies/profile' },
    { name: 'Products', path: '/api/products' },
    { name: 'Customers', path: '/api/customers' },
    { name: 'POS Sales', path: '/api/pos/sales' },
    { name: 'Subscription Plans', path: '/api/subscription-plans' }
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

async function testPaymentMethods() {
  logger.info('Testing payment method availability...');
  
  const tests = [
    {
      name: 'Stripe Status',
      test: async () => {
        const result = await makeRequest('POST', '/api/payments-enhanced/create-payment-intent', {
          amount: 10.00,
          currency: 'usd',
          description: 'Test payment'
        });
        
        // Should fail gracefully if Stripe not configured
        return result.status === 503 || result.success;
      }
    },
    {
      name: 'PayPal Status',
      test: async () => {
        const result = await makeRequest('GET', '/api/paypal/status');
        return result.success;
      }
    }
  ];
  
  let passed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) {
        logger.success(`${test.name} test passed`);
        passed++;
      } else {
        logger.warn(`${test.name} test failed (may be expected)`);
      }
    } catch (error) {
      logger.warn(`${test.name} test error: ${error.message}`);
    }
  }
  
  return passed >= 1; // At least one payment method should work
}

async function testDatabaseOperations() {
  logger.info('Testing database operations...');
  
  try {
    // Test product creation
    const productData = {
      name: 'Test Product ' + Date.now(),
      price: 9.99,
      category: 'Test Category',
      stock: 100
    };
    
    const createResult = await makeRequest('POST', '/api/products', productData);
    if (!createResult.success) {
      logger.error('Product creation failed:', createResult);
      return false;
    }
    
    const productId = createResult.data.product?.id;
    if (!productId) {
      logger.error('Product ID not returned');
      return false;
    }
    
    // Test product retrieval
    const getResult = await makeRequest('GET', `/api/products/${productId}`);
    if (!getResult.success) {
      logger.error('Product retrieval failed:', getResult);
      return false;
    }
    
    // Test product update
    const updateResult = await makeRequest('PUT', `/api/products/${productId}`, {
      name: 'Updated Test Product',
      price: 19.99
    });
    if (!updateResult.success) {
      logger.error('Product update failed:', updateResult);
      return false;
    }
    
    // Clean up - delete test product
    await makeRequest('DELETE', `/api/products/${productId}`);
    
    logger.success('Database operations test passed');
    return true;
    
  } catch (error) {
    logger.error('Database operations test error:', error.message);
    return false;
  }
}

// Main test runner
async function runCompleteSystemTest() {
  logger.info('🚀 Starting Complete System Test...');
  
  const testResults = {
    passed: 0,
    failed: 0,
    warnings: 0
  };
  
  try {
    // Start servers
    logger.info('📡 Starting servers...');
    await startBackendServer();
    
    // Wait for backend to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await startFrontendServer();
    
    // Wait for frontend to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Run tests
    const tests = [
      { name: 'Backend Health Check', fn: testBackendHealth, critical: true },
      { name: 'User Authentication', fn: testAuthentication, critical: true },
      { name: 'Payment Configuration', fn: testPaymentConfiguration, critical: false },
      { name: 'Frontend Accessibility', fn: testFrontendAccessibility, critical: false },
      { name: 'Core API Endpoints', fn: testCoreEndpoints, critical: true },
      { name: 'Payment Methods', fn: testPaymentMethods, critical: false },
      { name: 'Database Operations', fn: testDatabaseOperations, critical: true }
    ];
    
    for (const test of tests) {
      try {
        logger.info(`\\n--- Running: ${test.name} ---`);
        const result = await test.fn();
        
        if (result) {
          testResults.passed++;
          logger.success(`✅ ${test.name} PASSED`);
        } else {
          if (test.critical) {
            testResults.failed++;
            logger.error(`❌ ${test.name} FAILED (Critical)`);
          } else {
            testResults.warnings++;
            logger.warn(`⚠️  ${test.name} FAILED (Non-critical)`);
          }
        }
      } catch (error) {
        testResults.failed++;
        logger.error(`💥 ${test.name} CRASHED:`, error.message);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    logger.error('Test runner error:', error.message);
    testResults.failed++;
  } finally {
    stopServers();
  }
  
  // Test Summary
  logger.info('\\n' + '='.repeat(60));
  logger.info('🏁 COMPLETE SYSTEM TEST RESULTS');
  logger.info('='.repeat(60));
  logger.info(`✅ Tests Passed: ${testResults.passed}`);
  logger.info(`❌ Tests Failed: ${testResults.failed}`);
  logger.info(`⚠️  Warnings: ${testResults.warnings}`);
  
  const totalTests = testResults.passed + testResults.failed + testResults.warnings;
  const successRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : 0;
  
  logger.info(`📊 Success Rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    logger.success('🎉 ALL CRITICAL TESTS PASSED!');
    if (testResults.warnings > 0) {
      logger.warn(`⚠️  ${testResults.warnings} non-critical warnings - system is functional`);
    }
  } else {
    logger.error(`❌ ${testResults.failed} critical tests failed. System needs attention.`);
  }
  
  return testResults.failed === 0;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('\\n🛑 Test interrupted by user');
  stopServers();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\\n🛑 Test terminated');
  stopServers();
  process.exit(0);
});

// Run the tests
if (require.main === module) {
  runCompleteSystemTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logger.error('Test execution failed:', error.message);
      stopServers();
      process.exit(1);
    });
}

module.exports = { runCompleteSystemTest };
