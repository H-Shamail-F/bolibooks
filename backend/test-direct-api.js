const axios = require('axios');

async function testDirectAPI() {
  // Fresh token from the test above
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1ZmQ0ZjczNy1mODBiLTQ4MjktYmNlNi01ZjIxYzY1OTNjZTMiLCJlbWFpbCI6ImRlbW9AYm9saWJvb2tzLmNvbSIsInJvbGUiOiJvd25lciIsImNvbXBhbnlJZCI6ImU5ODczZGM2LWVjYzMtNDA0Yi05ZmM3LTg5YjdlMDMxYzExOSIsImlhdCI6MTc1NzU5NTU3MiwiZXhwIjoxNzU3NjgxOTcyfQ.lNsTOvBgEbpu9H6VNCtHgLXUJLOvSAq1sdOgTrWjrec';
  
  console.log('🧪 Testing Dashboard API with Fresh Token...');
  
  // Test different ports
  const portsToTry = [5001, 5000, 3000, 8000];
  
  for (const port of portsToTry) {
    try {
      console.log(`\n🔌 Trying port ${port}...`);
      
      // First test health endpoint
      const healthResponse = await axios.get(`http://localhost:${port}/api/health`, {
        timeout: 3000
      });
      
      console.log(`✅ Health check on port ${port}:`, healthResponse.data);
      
      // Then test dashboard API
      const dashboardResponse = await axios.get(`http://localhost:${port}/api/reports/dashboard-stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });
      
      console.log(`🎉 Dashboard API working on port ${port}!`);
      console.log('📊 Response:', JSON.stringify(dashboardResponse.data, null, 2));
      return; // Success, exit
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ Port ${port} - Connection refused (server not running)`);
      } else if (error.response) {
        console.log(`❌ Port ${port} - HTTP ${error.response.status}:`, error.response.data);
      } else {
        console.log(`❌ Port ${port} - Error:`, error.message);
      }
    }
  }
  
  console.log('\n💡 Server might not be running. The output above showed:');
  console.log('   "🚀 Simple server running on port 5001"');
  console.log('   But we cannot connect to any port.');
  console.log('   This suggests the server process might have crashed after startup.');
}

testDirectAPI();
