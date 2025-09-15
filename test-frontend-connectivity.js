const axios = require('axios');

async function testConnectivity() {
    console.log('🧪 Testing Frontend-Backend Connectivity...\n');

    try {
        // Test 1: Direct backend health check
        console.log('1️⃣ Testing direct backend connection...');
        const backendHealth = await axios.get('http://localhost:5000/api/health');
        console.log('✅ Backend Health:', backendHealth.data);

        // Test 2: API endpoint through backend - try auth me endpoint  
        console.log('\n2️⃣ Testing backend API endpoint...');
        try {
            const authResponse = await axios.get('http://localhost:5000/api/auth/me');
            console.log('✅ Backend API unexpected success:', authResponse.data);
        } catch (authError) {
            if (authError.response && authError.response.status === 401) {
                console.log('✅ Backend API works (401 unauthorized as expected)');
            } else {
                throw authError; // Re-throw if it's not a 401
            }
        }

        // Test 3: Frontend proxy test (simulating what React dev server does)
        console.log('\n3️⃣ Testing frontend proxy simulation...');
        const proxyTest = await axios.get('http://localhost:3000/api/health');
        console.log('✅ Frontend Proxy works:', proxyTest.data);

        // Test 4: Login attempt with seeded user
        console.log('\n4️⃣ Testing login through proxy...');
        const loginData = {
            email: 'admin@bolivooks.com',
            password: 'admin123'
        };
        
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', loginData);
        console.log('✅ Login successful:', {
            user: loginResponse.data.user.name,
            company: loginResponse.data.user.company.name,
            token: loginResponse.data.token ? 'Token received' : 'No token'
        });

        console.log('\n🎉 All connectivity tests passed! Frontend and Backend are properly connected.');

    } catch (error) {
        console.error('❌ Connectivity test failed:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, error.response.data);
        } else if (error.request) {
            console.error('No response received:', error.message);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testConnectivity();
