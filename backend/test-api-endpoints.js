const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testAPIEndpoints() {
  try {
    console.log('🧪 Testing BoliBooks API Endpoints...\n');

    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log(`   ✅ Health: ${health.data.message} (DB: ${health.data.database})\n`);

    // Test login with demo user
    console.log('2. Testing authentication...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'demo@example.com',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log(`   ✅ Login successful: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   ✅ Company: ${user.companyName || 'N/A'} (Status: ${user.subscriptionStatus || 'N/A'})`);
    console.log(`   ✅ Token received: ${token.substring(0, 20)}...\n`);

    // Setup headers for authenticated requests
    const authHeaders = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // Test subscription plans
    console.log('3. Testing subscription plans...');
    const plansResponse = await axios.get(`${BASE_URL}/subscriptions/plans`, authHeaders);
    const plans = plansResponse.data.data.plans;
    console.log(`   ✅ Found ${plans.length} subscription plans:`);
    plans.forEach(plan => {
      console.log(`      - ${plan.name}: $${plan.monthlyPrice}/month`);
    });
    console.log();

    // Test customers endpoint
    console.log('4. Testing customers endpoint...');
    const customers = await axios.get(`${BASE_URL}/customers`, authHeaders);
    console.log(`   ✅ Customers endpoint accessible (${customers.data.customers?.length || 0} customers)\n`);

    // Test products endpoint
    console.log('5. Testing products endpoint...');
    const products = await axios.get(`${BASE_URL}/products`, authHeaders);
    console.log(`   ✅ Products endpoint accessible (${products.data.products?.length || 0} products)\n`);

    // Test invoices endpoint
    console.log('6. Testing invoices endpoint...');
    const invoices = await axios.get(`${BASE_URL}/invoices`, authHeaders);
    console.log(`   ✅ Invoices endpoint accessible (${invoices.data.invoices?.length || 0} invoices)\n`);

    // Test dashboard stats endpoint
    console.log('7. Testing dashboard stats endpoint...');
    const stats = await axios.get(`${BASE_URL}/reports/dashboard-stats`, authHeaders);
    console.log(`   ✅ Dashboard stats accessible:`);
    console.log(`      - Total Revenue: $${stats.data.totalRevenue || 0}`);
    console.log(`      - Total Customers: ${stats.data.totalCustomers || 0}`);
    console.log(`      - Total Products: ${stats.data.totalProducts || 0}`);
    console.log(`      - Total Invoices: ${stats.data.totalInvoices || 0}\n`);

    console.log('✅ All API endpoint tests passed successfully!');
    console.log('\n🎯 Demo User Credentials:');
    console.log('   Email: demo@example.com');
    console.log('   Password: demo123');
    console.log('\n📝 Next steps:');
    console.log('   1. Visit http://localhost:3000 in your browser');
    console.log('   2. Login with the demo credentials above');
    console.log('   3. Explore the BoliBooks dashboard and features');

  } catch (error) {
    console.error('❌ API Test Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testAPIEndpoints();
