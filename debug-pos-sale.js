const axios = require('axios');

async function debugPosSale() {
  console.log('🔍 Debugging POS Sale Creation...\n');

  try {
    // Login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@bolivooks.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Authenticated');

    // Get first product
    const productsResponse = await axios.get('http://localhost:5000/api/pos/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const products = productsResponse.data.data.products;
    console.log(`✅ Found ${products.length} products`);
    
    if (products.length === 0) {
      console.log('❌ No products available');
      return;
    }

    const product = products[0];
    console.log(`Using product: ${product.name} (ID: ${product.id})`);

    // Test minimal POS sale creation
    const saleData = {
      items: [{
        productId: product.id,
        quantity: 1
      }],
      paymentMethod: 'cash',
      amountTendered: 100
    };

    console.log('\nSale data:', JSON.stringify(saleData, null, 2));
    console.log('Attempting to create POS sale...');

    try {
      const saleResponse = await axios.post('http://localhost:5000/api/pos/sales', saleData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ POS sale created successfully!');
      console.log('Response:', saleResponse.data);

    } catch (error) {
      console.log('❌ POS sale creation failed');
      console.log('Error type:', error.code);
      console.log('Status:', error.response?.status);
      console.log('Error message:', error.response?.data?.message || error.message);
      console.log('Error details:', error.response?.data || 'No details');
      
      if (error.code === 'ECONNRESET') {
        console.log('\n🔧 Connection reset indicates server crash. Check server logs.');
      }
    }

  } catch (error) {
    console.log('❌ Debug failed:', error.message);
  }
}

debugPosSale().catch(console.error);
