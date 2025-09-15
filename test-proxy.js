const axios = require('axios');

async function testProxy() {
  console.log('Testing proxy connection from frontend to backend...\n');

  // Test 1: Direct backend connection
  try {
    const response = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Direct backend connection successful');
    console.log(`   Response: ${response.status} - ${response.data.message}`);
  } catch (error) {
    console.log('❌ Direct backend connection failed:', error.message);
  }

  // Test 2: Frontend proxy connection (if running on port 3000)
  try {
    const response = await axios.get('http://localhost:3000/api/health');
    console.log('✅ Frontend proxy connection successful');
    console.log(`   Response: ${response.status} - ${response.data.message}`);
  } catch (error) {
    console.log('❌ Frontend proxy connection failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('   This is expected if frontend is not running or proxy is misconfigured');
    }
  }

  // Test 3: Test login with seeded user data
  try {
    const loginData = {
      email: 'admin@example.com',
      password: 'admin123'
    };
    const response = await axios.post('http://localhost:5000/api/auth/login', loginData);
    console.log('✅ Authentication test successful');
    console.log(`   Token received: ${response.data.token ? 'Yes' : 'No'}`);
  } catch (error) {
    console.log('❌ Authentication test failed:', error.response?.data?.message || error.message);
  }

  console.log('\nProxy test completed!');
}

testProxy().catch(console.error);
