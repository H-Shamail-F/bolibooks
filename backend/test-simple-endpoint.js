const axios = require('axios');

// Test the simple dashboard API endpoint
async function testSimpleAPI() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1ZmQ0ZjczNy1mODBiLTQ4MjktYmNlNi01ZjIxYzY1OTNjZTMiLCJlbWFpbCI6ImRlbW9AYm9saWJvb2tzLmNvbSIsInJvbGUiOiJvd25lciIsImNvbXBhbnlJZCI6ImU5ODczZGM2LWVjYzMtNDA0Yi05ZmM3LTg5YjdlMDMxYzExOSIsImlhdCI6MTc1NzU5NDIxNiwiZXhwIjoxNzU3NjgwNjE2fQ.zzL-wY7CsBRf_SnRyeKEd1fD92FUWeEgbEsTjqgNLAw';
  
  const baseURL = 'http://localhost:5001';
  
  try {
    console.log('🧪 Testing Simple Dashboard API endpoint...');
    console.log(`📡 Making request to: ${baseURL}/api/test/dashboard`);
    
    const response = await axios.get(`${baseURL}/api/test/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ API call successful!');
    console.log('📊 Response status:', response.status);
    console.log('📈 Dashboard data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    } else if (error.request) {
      console.error('🔍 No response received. Check if test server is running');
    } else {
      console.error('⚠️ Request setup error:', error.message);
    }
  }
}

// Run the test
testSimpleAPI();
