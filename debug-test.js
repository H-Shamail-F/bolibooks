const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAPIs() {
    try {
        console.log('🧪 Testing APIs...\n');
        
        // Test login first
        console.log('1. Testing login...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@bolivooks.com',
            password: 'admin123'
        });
        console.log('✅ Login successful, got token:', loginResponse.data.token ? 'YES' : 'NO');
        
        const token = loginResponse.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        
        // Test products API
        console.log('\n2. Testing products API...');
        try {
            const productsResponse = await axios.get(`${BASE_URL}/products`, { headers });
            console.log('✅ Products response type:', typeof productsResponse.data);
            console.log('✅ Products is array:', Array.isArray(productsResponse.data));
            console.log('✅ Products count:', productsResponse.data.length || 0);
            if (productsResponse.data.length > 0) {
                console.log('✅ First product:', JSON.stringify(productsResponse.data[0], null, 2));
            }
        } catch (error) {
            console.log('❌ Products API error:', error.response?.status, error.response?.data);
        }
        
        // Test POS products API
        console.log('\n3. Testing POS products API...');
        try {
            const posProductsResponse = await axios.get(`${BASE_URL}/pos/products`, { headers });
            console.log('✅ POS Products response type:', typeof posProductsResponse.data);
            console.log('✅ POS Products is array:', Array.isArray(posProductsResponse.data));
            console.log('✅ POS Products count:', posProductsResponse.data.length || 0);
        } catch (error) {
            console.log('❌ POS Products API error:', error.response?.status, error.response?.data);
        }
        
        // Test payments endpoints
        console.log('\n4. Testing payment endpoints...');
        try {
            const stripeResponse = await axios.post(`${BASE_URL}/payments/stripe/create-payment-intent`, {
                amount: 1000,
                currency: 'usd',
                description: 'Test payment'
            }, { headers });
            console.log('✅ Stripe API exists:', true);
        } catch (error) {
            console.log('❌ Stripe API error:', error.response?.status, error.response?.data?.error || error.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAPIs();
