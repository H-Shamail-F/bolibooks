const axios = require('axios');

async function testDashboardAPI() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1ZmQ0ZjczNy1mODBiLTQ4MjktYmNlNi01ZjIxYzY1OTNjZTMiLCJlbWFpbCI6ImRlbW9AYm9saWJvb2tzLmNvbSIsInJvbGUiOiJvd25lciIsImNvbXBhbnlJZCI6ImU5ODczZGM2LWVjYzMtNDA0Yi05ZmM3LTg5YjdlMDMxYzExOSIsImlhdCI6MTc1NzU5NDIxNiwiZXhwIjoxNzU3NjgwNjE2fQ.zzL-wY7CsBRf_SnRyeKEd1fD92FUWeEgbEsTjqgNLAw';
  
  const baseURL = 'http://localhost:5001';
  
  try {
    console.log('🧪 Testing Fixed Dashboard API...');
    
    // Test 1: Dashboard stats endpoint
    console.log('\n1️⃣ Testing dashboard-stats endpoint:');
    const response1 = await axios.get(`${baseURL}/api/reports/dashboard-stats`, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 10000
    });
    console.log('✅ Dashboard stats working!');
    console.log('📊 Stats:', JSON.stringify(response1.data, null, 2));
    
    // Test 2: Simple dashboard endpoint
    console.log('\n2️⃣ Testing simple dashboard endpoint:');
    const response2 = await axios.get(`${baseURL}/api/reports/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 10000
    });
    console.log('✅ Simple dashboard working!');
    console.log('📈 Data:', JSON.stringify(response2.data, null, 2));
    
    // Test 3: Test profit-loss endpoint
    console.log('\n3️⃣ Testing profit-loss endpoint:');
    const response3 = await axios.get(`${baseURL}/api/reports/profit-loss`, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 10000
    });
    console.log('✅ Profit & Loss working!');
    console.log('💰 Summary:', response3.data.summary);
    
    console.log('\n🎉 All dashboard endpoints are working correctly!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('🔍 No response received. Check if server is running on port 5001');
    } else {
      console.error('⚠️ Request setup error:', error.message);
    }
  }
}

testDashboardAPI();
