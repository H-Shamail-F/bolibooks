const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function debugUserAndProducts() {
  console.log('🔍 Debugging User and Products Data...\n');

  try {
    // Step 1: Login and examine user data
    console.log('1. Logging in and examining user data...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@bolivooks.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log('User data from login:', JSON.stringify(user, null, 2));
    console.log(`User ID: ${user.id}`);
    console.log(`User role: ${user.role}`);
    console.log(`User companyId: ${user.companyId}`);
    console.log(`User company: ${user.company || user.Company || 'Not loaded'}`);

    // Step 2: Check regular products endpoint
    console.log('\n2. Checking regular products endpoint...');
    try {
      const regularProductsResponse = await axios.get(`${BASE_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const regularProducts = regularProductsResponse.data.products || regularProductsResponse.data;
      console.log(`Regular products found: ${regularProducts.length}`);
      if (regularProducts.length > 0) {
        const firstProduct = regularProducts[0];
        console.log('First regular product:', {
          id: firstProduct.id,
          name: firstProduct.name,
          companyId: firstProduct.companyId,
          isActive: firstProduct.isActive,
          trackInventory: firstProduct.trackInventory,
          stockQuantity: firstProduct.stockQuantity
        });
      }
    } catch (error) {
      console.log('❌ Regular products failed:', error.response?.data || error.message);
    }

    // Step 3: Check POS products endpoint
    console.log('\n3. Checking POS products endpoint...');
    try {
      const posProductsResponse = await axios.get(`${BASE_URL}/pos/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('POS products response:', posProductsResponse.data);
    } catch (error) {
      console.log('❌ POS products failed:', error.response?.data || error.message);
    }

    // Step 4: Check companies
    console.log('\n4. Checking companies...');
    try {
      const companiesResponse = await axios.get(`${BASE_URL}/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Companies found:', companiesResponse.data);
    } catch (error) {
      console.log('❌ Companies endpoint failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.log('❌ Debug failed:', error.response?.data || error.message);
  }
}

debugUserAndProducts().catch(console.error);
