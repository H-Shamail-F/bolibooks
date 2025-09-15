const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testPosSale() {
  console.log('🧪 Testing POS Sale Creation Endpoint...\n');

  let token = null;

  try {
    // Step 1: Login to get authentication token
    console.log('1. Authenticating...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@bolivooks.com',
      password: 'admin123'
    });
    
    token = loginResponse.data.token;
    console.log('✅ Authentication successful');
    console.log(`   User: ${loginResponse.data.user.name} (${loginResponse.data.user.role})`);
    console.log(`   Company: ${loginResponse.data.user.Company?.name || 'N/A'}\n`);

  } catch (error) {
    console.log('❌ Authentication failed:', error.response?.data?.message || error.message);
    return;
  }

  try {
    // Step 2: Get available products from POS endpoint
    console.log('2. Fetching POS products...');
    const productsResponse = await axios.get(`${BASE_URL}/pos/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const products = productsResponse.data.data.products || [];
    console.log(`✅ Found ${products.length} POS products`);
    
    if (products.length === 0) {
      console.log('❌ No products available for POS testing');
      return;
    }

    // Use first available product for testing
    const testProduct = products[0];
    console.log(`   Using product: ${testProduct.name} - $${testProduct.price}\n`);

    // Step 3: Test POS sale creation
    console.log('3. Testing POS sale creation...');
    
    const saleData = {
      items: [{
        productId: testProduct.id,
        quantity: 2
      }],
      paymentMethod: 'cash',
      amountTendered: (testProduct.price * 2) * 1.1,
      notes: 'Test POS sale'
    };

    console.log('   Sale data:', JSON.stringify(saleData, null, 2));

    const saleResponse = await axios.post(`${BASE_URL}/pos/sales`, saleData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ POS sale created successfully!');
    console.log('   Sale ID:', saleResponse.data.sale?.id);
    console.log('   Total:', saleResponse.data.sale?.total);
    console.log('   Items:', saleResponse.data.sale?.items?.length);

  } catch (error) {
    console.log('❌ POS sale creation failed');
    console.log('   Status:', error.response?.status);
    console.log('   Error:', error.response?.data?.message || error.message);
    console.log('   Details:', error.response?.data?.error || '');
    
    if (error.response?.data?.details) {
      console.log('   Validation details:', error.response.data.details);
    }

    // Let's also try to check what endpoints are available
    console.log('\n4. Checking available POS endpoints...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/pos/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ /api/pos/products endpoint is available');
    } catch (e) {
      console.log('❌ /api/pos/products endpoint failed:', e.response?.status);
    }

    try {
      const barcodeScanResponse = await axios.post(`${BASE_URL}/pos/products/barcode/scan`, 
        { barcode: 'test123' },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      console.log('✅ /api/pos/products/barcode/scan endpoint responded');
    } catch (e) {
      console.log('❌ /api/pos/products/barcode/scan endpoint failed:', e.response?.status);
    }
  }

  console.log('\nPOS sale test completed!');
}

testPosSale().catch(console.error);
