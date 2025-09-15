// Test specific fixes for previously failing endpoints
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testFixes() {
  console.log('🔧 Testing Fixed Endpoints...\n');

  try {
    // Login first
    console.log('🔐 Logging in...');
    const login = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@bolivooks.com',
      password: 'admin123'
    });
    const token = login.data.token;
    console.log('✅ Login successful');

    // Test 1: Product Listing (was returning non-array)
    console.log('\n1️⃣ Testing Product Listing...');
    const products = await axios.get(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Handle paginated response
    const productsList = products.data.products || products.data;
    console.log(`✅ Products: ${productsList.length} found (Array: ${Array.isArray(productsList)})`);

    // Test 2: Customer Listing (was 500 error)
    console.log('\n2️⃣ Testing Customer Listing...');
    const customers = await axios.get(`${API_BASE}/customers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Handle paginated response 
    const customersList = customers.data.customers || customers.data;
    console.log(`✅ Customers: ${customersList.length} found (Array: ${Array.isArray(customersList)})`);

    // Test 3: Subscription Plans (was 404)
    console.log('\n3️⃣ Testing Subscription Plans...');
    const plans = await axios.get(`${API_BASE}/companies/subscription-plans`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Subscription Plans: ${plans.data.length} found`);

    // Test 4: POS Products (was 500 error)
    console.log('\n4️⃣ Testing POS Products...');
    const posProducts = await axios.get(`${API_BASE}/pos/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Handle POS response format
    const posProductsList = posProducts.data?.data?.products || posProducts.data?.products || posProducts.data || [];
    console.log(`✅ POS Products: ${posProductsList.length} found`);

    // Test 5: Sales Report (was 500 error)
    console.log('\n5️⃣ Testing Sales Report...');
    const salesReport = await axios.get(`${API_BASE}/reports/sales`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Sales Report generated`);

    // Test 6: Dashboard Stats
    console.log('\n6️⃣ Testing Dashboard Stats...');
    const dashboard = await axios.get(`${API_BASE}/reports/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Dashboard Stats: ${Object.keys(dashboard.data).length} metrics`);

    // Test 7: Create a test product for POS tests
    console.log('\n7️⃣ Creating test product with stock...');
    const testProduct = {
      name: 'POS Test Product',
      price: 15.99,
      sku: `POS-TEST-${Date.now()}`,
      category: 'Test',
      stock: 10, // Add stock for POS
      description: 'Product for POS testing'
    };
    const productResponse = await axios.post(`${API_BASE}/products`, testProduct, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const productId = productResponse.data.id;
    console.log(`✅ Test product created: ${productId}`);

    // Test 8: Barcode scanning
    console.log('\n8️⃣ Testing Barcode Scanning...');
    const scanResponse = await axios.get(`${API_BASE}/pos/scan/${testProduct.sku}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Barcode scan successful: ${scanResponse.data.name}`);

    // Test 9: POS Sale Creation
    console.log('\n9️⃣ Testing POS Sale Creation...');
    const sale = {
      items: [{
        productId: productId,
        quantity: 2,
        price: 15.99
      }],
      paymentMethod: 'cash',
      total: 31.98,
      amountReceived: 35.00,
      change: 3.02
    };
    const saleResponse = await axios.post(`${API_BASE}/pos/sales`, sale, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ POS Sale created: ${saleResponse.data.id}`);

    console.log('\n🎉 All fixed endpoints are working! ✅');

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
  }
}

testFixes();
