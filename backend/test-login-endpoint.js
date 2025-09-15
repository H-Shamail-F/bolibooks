const axios = require('axios');

async function testLoginEndpoint() {
    try {
        console.log('🧪 Testing login endpoint...');
        
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'demo@bolibooks.com',
            password: 'demo123'
        });
        
        console.log('✅ Login endpoint working!');
        console.log('Token received:', response.data.token ? 'Yes' : 'No');
        console.log('User data:', response.data.user ? 'Yes' : 'No');
        
    } catch (error) {
        console.log('❌ Login endpoint failed:');
        console.log('Status:', error.response?.status);
        console.log('Error:', error.response?.data?.error || error.message);
    }
}

testLoginEndpoint();
