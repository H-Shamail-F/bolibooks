const axios = require('axios');

async function testEndpoints() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1ZmQ0ZjczNy1mODBiLTQ4MjktYmNlNi01ZjIxYzY1OTNjZTMiLCJlbWFpbCI6ImRlbW9AYm9saWJvb2tzLmNvbSIsInJvbGUiOiJvd25lciIsImNvbXBhbnlJZCI6ImU5ODczZGM2LWVjYzMtNDA0Yi05ZmM3LTg5YjdlMDMxYzExOSIsImlhdCI6MTc1NzU5NDIxNiwiZXhwIjoxNzU3NjgwNjE2fQ.zzL-wY7CsBRf_SnRyeKEd1fD92FUWeEgbEsTjqgNLAw';
  
  console.log('1. Testing simple endpoint (no auth)...');
  try {
    const response1 = await axios.get('http://localhost:5002/api/test/simple');
    console.log('✅ Simple endpoint works:', response1.data);
  } catch (error) {
    console.log('❌ Simple endpoint failed:', error.message);
  }
  
  console.log('\\n2. Testing auth endpoint...');
  try {
    const response2 = await axios.get('http://localhost:5002/api/test/auth', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Auth endpoint works:', response2.data);
  } catch (error) {
    console.log('❌ Auth endpoint failed:', error.message);
    if (error.response) {
      console.log('Response data:', error.response.data);
    }
  }
  
  console.log('\\n3. Testing main server simple endpoint...');
  try {
    const response3 = await axios.get('http://localhost:5000/api/reports/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Main server dashboard works:', response3.data);
  } catch (error) {
    console.log('❌ Main server endpoint failed:', error.message);
    if (error.response) {
      console.log('Response data:', error.response.data);
    }
  }
}

testEndpoints();
