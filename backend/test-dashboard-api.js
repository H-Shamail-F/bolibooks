const axios = require('axios');

// Test the dashboard API endpoint
async function testDashboardAPI() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1ZmQ0ZjczNy1mODBiLTQ4MjktYmNlNi01ZjIxYzY1OTNjZTMiLCJlbWFpbCI6ImRlbW9AYm9saWJvb2tzLmNvbSIsInJvbGUiOiJvd25lciIsImNvbXBhbnlJZCI6ImU5ODczZGM2LWVjYzMtNDA0Yi05ZmM3LTg5YjdlMDMxYzExOSIsImlhdCI6MTc1NzU5NDIxNiwiZXhwIjoxNzU3NjgwNjE2fQ.zzL-wY7CsBRf_SnRyeKEd1fD92FUWeEgbEsTjqgNLAw';
  
  const baseURL = 'http://localhost:5000';
  
  try {
    console.log('🧪 Testing Dashboard API endpoint...');
    console.log(`📡 Making request to: ${baseURL}/api/reports/dashboard`);
    console.log(`🔑 Using token: ${token.substring(0, 50)}...`);
    
    const response = await axios.get(`${baseURL}/api/reports/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log('✅ API call successful!');
    console.log('📊 Response status:', response.status);
    console.log('📈 Dashboard stats:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    } else if (error.request) {
      console.error('🔍 No response received. Is the backend server running?');
      console.error('💡 Start the backend with: node src/server.js');
    } else {
      console.error('⚠️ Request setup error:', error.message);
    }
  }
}

// Run the test
testDashboardAPI();
