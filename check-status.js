const axios = require('axios');

async function checkStatus() {
    console.log('Checking BoliBooks System Status...\n');
    
    // Check backend health
    try {
        const response = await axios.get('http://localhost:5000/api/health', { timeout: 5000 });
        console.log('✅ Backend Health:', response.data.message);
    } catch (error) {
        console.log('❌ Backend:', error.message);
        return;
    }
    
    // Check frontend
    try {
        const response = await axios.get('http://localhost:3000', { timeout: 5000 });
        if (response.status === 200) {
            console.log('✅ Frontend: Accessible');
        }
    } catch (error) {
        console.log('❌ Frontend:', error.message);
        return;
    }
    
    // Test login
    try {
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@testcompany.com',
            password: 'password123'
        });
        
        if (loginResponse.data.success) {
            console.log('✅ Authentication: Working');
            console.log('✅ User:', loginResponse.data.user.firstName, loginResponse.data.user.lastName);
        }
    } catch (error) {
        console.log('❌ Authentication:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎉 BoliBooks is ready! Open http://localhost:3000 to start using it.');
}

checkStatus().catch(console.error);
