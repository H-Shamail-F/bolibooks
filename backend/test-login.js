const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('🧪 Testing login with admin credentials...');
    
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@bolivooks.com',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('User:', data.user);
      console.log('Token length:', data.token?.length);
      
      // Test protected endpoint
      console.log('\n🧪 Testing protected endpoint...');
      const meResponse = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });
      
      const meData = await meResponse.json();
      if (meResponse.ok) {
        console.log('✅ Protected endpoint works!');
        console.log('User data:', meData.user);
      } else {
        console.log('❌ Protected endpoint failed:', meData);
      }
      
    } else {
      console.log('❌ Login failed:', data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLogin();
