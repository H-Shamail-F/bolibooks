// BML Payment Integration Test
const axios = require('axios');

const baseURL = 'http://localhost:3001/api';

async function testBMLIntegration() {
  console.log('🧪 Testing BML Payment Integration...\n');

  try {
    // 1. Test backend health
    console.log('1️⃣ Testing backend health...');
    const health = await axios.get(`${baseURL}/health`);
    console.log(`✅ Backend healthy: ${health.data.status}`);

    // 2. Login to get valid token
    console.log('\n2️⃣ Logging in...');
    const login = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@bolivooks.com',
      password: 'admin123'
    });
    const token = login.data.token;
    console.log('✅ Login successful');

    // 3. Test BML config endpoint
    console.log('\n3️⃣ Testing BML config...');
    const config = await axios.get(`${baseURL}/payments/bml/config`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ BML Config:', JSON.stringify(config.data, null, 2));

    // 4. Test BML payment creation
    console.log('\n4️⃣ Testing BML payment creation...');
    const payment = await axios.post(`${baseURL}/payments/bml/create`, {
      amount: 100.00,
      currency: 'MVR',
      orderId: `test-${Date.now()}`,
      description: 'Test BML Payment',
      customer: { email: 'test@example.com', name: 'Test User' }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ BML Payment Created:', JSON.stringify(payment.data, null, 2));

    // 5. Test payment status check
    console.log('\n5️⃣ Testing BML payment status...');
    const reference = payment.data.reference;
    if (reference) {
      const status = await axios.get(`${baseURL}/payments/bml/status/${reference}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Payment Status:', JSON.stringify(status.data, null, 2));
    }

    console.log('\n🎉 BML Integration Test Complete! All endpoints working.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testBMLIntegration();
