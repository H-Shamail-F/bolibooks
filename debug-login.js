const axios = require('axios');

async function testLogin() {
    console.log('🔍 Debugging login issue...\n');

    const loginData = {
        email: 'admin@bolivooks.com',
        password: 'admin123'
    };

    console.log('Testing login with:', {
        email: loginData.email,
        password: '***hidden***'
    });

    try {
        // Test direct backend login
        console.log('\n1️⃣ Testing direct backend login...');
        const response = await axios.post('http://localhost:5000/api/auth/login', loginData);
        console.log('✅ Login successful!');
        console.log('Response:', {
            success: response.data.success,
            user: response.data.user?.firstName + ' ' + response.data.user?.lastName,
            role: response.data.user?.role,
            company: response.data.user?.company?.name,
            token: response.data.token ? 'Token provided' : 'No token'
        });

        // Test the token works
        console.log('\n2️⃣ Testing token authentication...');
        const meResponse = await axios.get('http://localhost:5000/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${response.data.token}`
            }
        });
        console.log('✅ Token works!');
        console.log('User info:', {
            name: meResponse.data.user.firstName + ' ' + meResponse.data.user.lastName,
            email: meResponse.data.user.email,
            role: meResponse.data.user.role
        });

    } catch (error) {
        console.error('❌ Login failed:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, error.response.data);
        } else {
            console.error('Error:', error.message);
        }

        // Let's also try to see what users exist in the database
        console.log('\n🔍 Let me check if the user exists by trying other emails...');
        const testEmails = [
            'admin@bolivooks.com',
            'manager@bolivooks.com',
            'owner@smallbiz.com'
        ];

        for (const email of testEmails) {
            try {
                const testResponse = await axios.post('http://localhost:5000/api/auth/login', {
                    email,
                    password: 'admin123'
                });
                console.log(`✅ Found working user: ${email}`);
                break;
            } catch (e) {
                console.log(`❌ Failed with email: ${email}`);
            }
        }
    }
}

testLogin();
