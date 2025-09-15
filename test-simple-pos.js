const axios = require('axios');

async function testSimplePosSale() {
  console.log('🔧 Testing Simple POS Sale Creation...\n');

  try {
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@bolivooks.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log(`✅ Logged in as ${user.email} (Company: ${user.companyId})`);

    // Get one product
    const productsResponse = await axios.get('http://localhost:5000/api/pos/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const products = productsResponse.data.data.products;
    if (products.length === 0) {
      console.log('❌ No products available');
      return;
    }

    const product = products[0];
    console.log(`✅ Using product: ${product.name} (${product.id})`);

    // Try creating POS sale directly via models (bypassing route validation)
    console.log('\n🧪 Testing direct model creation...');
    
    const { initializeDatabase } = require('./backend/src/database');
    await initializeDatabase();
    const { models } = require('./backend/src/database');

    // Create POS sale directly
    const posSale = await models.POSSale.create({
      companyId: user.companyId,
      cashierId: user.id,
      subtotal: product.price,
      taxAmount: product.price * 0.1,
      total: product.price * 1.1,
      paymentMethod: 'cash',
      paymentDetails: {},
      amountTendered: product.price * 1.1,
      customerInfo: {},
      notes: 'Test POS sale',
      deviceInfo: {}
    });

    console.log('✅ Direct model creation successful!');
    console.log('Sale ID:', posSale.id);
    console.log('Sale Number:', posSale.saleNumber);
    
    // Now test the API route
    console.log('\n🧪 Testing API route...');
    
    const saleData = {
      items: [{
        productId: product.id,
        quantity: 1
      }],
      paymentMethod: 'cash',
      amountTendered: 100
    };

    const saleResponse = await axios.post('http://localhost:5000/api/pos/sales', saleData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API route creation successful!');
    console.log('Response:', saleResponse.data);

  } catch (error) {
    console.log('❌ Test failed');
    console.log('Type:', error.constructor.name);
    console.log('Message:', error.message);
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
    
    if (error.stack) {
      console.log('\nStack trace:', error.stack);
    }
  }
}

testSimplePosSale().catch(console.error);
