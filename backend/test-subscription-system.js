const axios = require('axios');
const readline = require('readline');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

class SubscriptionTester {
  constructor() {
    this.token = null;
    this.companyId = null;
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${API_BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`❌ Request failed: ${error.response?.data?.error || error.message}`);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message,
        status: error.response?.status
      };
    }
  }

  async login() {
    console.log('\n🔐 Login Test');
    const email = await prompt('Enter your email: ');
    const password = await prompt('Enter your password: ');

    const result = await this.makeRequest('POST', '/auth/login', {
      email,
      password
    });

    if (result.success) {
      this.token = result.data.token;
      this.companyId = result.data.user.companyId;
      console.log('✅ Login successful');
      console.log(`   User: ${result.data.user.name}`);
      console.log(`   Company: ${result.data.user.companyId}`);
      return true;
    }
    return false;
  }

  async testGetPlans() {
    console.log('\n📋 Testing: Get Subscription Plans');
    const result = await this.makeRequest('GET', '/subscriptions/plans');
    
    if (result.success) {
      console.log('✅ Plans fetched successfully');
      console.log(`   Found ${result.data.plans?.length || 0} plans:`);
      result.data.plans?.forEach(plan => {
        console.log(`   - ${plan.name}: $${plan.monthlyPrice}/month (${plan.planTier})`);
      });
      return result.data.plans;
    } else {
      console.log('❌ Failed to fetch plans');
      return null;
    }
  }

  async testGetCurrentSubscription() {
    console.log('\n📊 Testing: Get Current Subscription');
    const result = await this.makeRequest('GET', '/subscriptions/current');
    
    if (result.success) {
      console.log('✅ Current subscription fetched successfully');
      const sub = result.data;
      console.log(`   Company: ${sub.company?.name}`);
      console.log(`   Status: ${sub.company?.subscriptionStatus}`);
      console.log(`   Plan: ${sub.company?.subscriptionPlan || 'None'}`);
      console.log(`   In Trial: ${sub.inTrial ? 'Yes' : 'No'}`);
      if (sub.usage) {
        console.log('   Usage:');
        console.log(`     Users: ${sub.usage.users?.current || 0}/${sub.usage.users?.limit || 0}`);
        console.log(`     Products: ${sub.usage.products?.current || 0}/${sub.usage.products?.limit || 0}`);
      }
      return sub;
    } else {
      console.log('❌ Failed to fetch current subscription');
      return null;
    }
  }

  async testSubscribeToPlan(plans) {
    if (!plans || plans.length === 0) {
      console.log('❌ No plans available for subscription test');
      return false;
    }

    console.log('\n💳 Testing: Subscribe to Plan');
    
    // Show available plans
    console.log('Available plans:');
    plans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name} - $${plan.monthlyPrice}/month`);
    });

    const planIndex = parseInt(await prompt('Select plan number (0 to skip): ')) - 1;
    
    if (planIndex < 0 || planIndex >= plans.length) {
      console.log('⏭️ Skipping subscription test');
      return false;
    }

    const selectedPlan = plans[planIndex];
    const billingPeriod = (await prompt('Billing period (monthly/yearly) [monthly]: ')) || 'monthly';

    const result = await this.makeRequest('POST', '/subscriptions/subscribe', {
      planId: selectedPlan.id,
      billingPeriod,
      paymentMethodId: 'test_payment_method' // Mock payment method
    });

    if (result.success) {
      console.log('✅ Subscription successful');
      console.log(`   Plan: ${result.data.plan}`);
      console.log(`   Billing: ${result.data.billingPeriod}`);
      console.log(`   Price: $${result.data.price}`);
      return true;
    } else {
      console.log(`❌ Subscription failed: ${result.error}`);
      return false;
    }
  }

  async testAddAddOn() {
    console.log('\n➕ Testing: Add Add-on');
    
    const addOnTypes = [
      { type: 'extraUser', name: 'Extra Users ($3/user/month)' },
      { type: 'extraSKUs', name: 'Extra SKUs ($5/1000 SKUs/month)' },
      { type: 'extraBranch', name: 'Extra Branch ($29/branch/month)' },
      { type: 'premiumSupport', name: 'Premium Support ($49/month)' }
    ];

    console.log('Available add-ons:');
    addOnTypes.forEach((addon, index) => {
      console.log(`${index + 1}. ${addon.name}`);
    });

    const addonIndex = parseInt(await prompt('Select add-on number (0 to skip): ')) - 1;
    
    if (addonIndex < 0 || addonIndex >= addOnTypes.length) {
      console.log('⏭️ Skipping add-on test');
      return false;
    }

    const selectedAddOn = addOnTypes[addonIndex];
    let quantity = 1;
    
    if (selectedAddOn.type !== 'premiumSupport') {
      quantity = parseInt(await prompt('Quantity [1]: ')) || 1;
    }

    const result = await this.makeRequest('POST', '/subscriptions/add-ons', {
      addOnType: selectedAddOn.type,
      quantity
    });

    if (result.success) {
      console.log('✅ Add-on added successfully');
      console.log(`   Type: ${result.data.addOnType}`);
      console.log(`   Quantity: ${result.data.quantity}`);
      console.log(`   Price: $${result.data.totalPrice}/month`);
      return true;
    } else {
      console.log(`❌ Add-on failed: ${result.error}`);
      return false;
    }
  }

  async testFinancialDashboard() {
    console.log('\n📈 Testing: Financial Dashboard');
    const result = await this.makeRequest('GET', '/financial-reports/dashboard');
    
    if (result.success) {
      console.log('✅ Financial dashboard fetched successfully');
      const data = result.data;
      if (data.summary) {
        console.log(`   Monthly Revenue: $${data.summary.currentMonthRevenue || 0}`);
        console.log(`   YTD Revenue: $${data.summary.currentYearRevenue || 0}`);
        console.log(`   Outstanding: $${data.summary.outstandingAmount || 0}`);
        console.log(`   Cash Position: $${data.summary.cashPosition || 0}`);
      }
      if (data.trends) {
        console.log(`   Revenue Trend Points: ${data.trends.revenue?.length || 0}`);
        console.log(`   Expense Trend Points: ${data.trends.expenses?.length || 0}`);
      }
      return true;
    } else {
      console.log(`❌ Failed to fetch dashboard: ${result.error}`);
      return false;
    }
  }

  async testUsageStats() {
    console.log('\n📊 Testing: Usage Statistics');
    const result = await this.makeRequest('GET', '/companies/usage-stats');
    
    if (result.success) {
      console.log('✅ Usage stats fetched successfully');
      const data = result.data;
      console.log(`   Users: ${data.users?.current || 0}/${data.users?.limit || 0}`);
      console.log(`   Products: ${data.products?.current || 0}/${data.products?.limit || 0}`);
      console.log(`   Branches: ${data.branches?.current || 0}/${data.branches?.limit || 0}`);
      console.log(`   Storage: ${data.storage?.current || 0}GB/${data.storage?.limit || 0}GB`);
      return true;
    } else {
      console.log(`❌ Failed to fetch usage stats: ${result.error}`);
      return false;
    }
  }

  async testBillingHistory() {
    console.log('\n🧾 Testing: Billing History');
    const result = await this.makeRequest('GET', '/subscriptions/billing-history');
    
    if (result.success) {
      console.log('✅ Billing history fetched successfully');
      const history = result.data.billingHistory || [];
      console.log(`   Found ${history.length} billing records`);
      history.slice(0, 3).forEach(record => {
        console.log(`   - ${record.description}: $${record.amount} (${record.status})`);
      });
      return true;
    } else {
      console.log(`❌ Failed to fetch billing history: ${result.error}`);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 BoliBooks Subscription System Test Suite\n');
    
    // Login first
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed without login');
      rl.close();
      return;
    }

    // Test sequence
    const plans = await this.testGetPlans();
    await this.testGetCurrentSubscription();
    await this.testUsageStats();
    
    // Interactive tests
    const shouldTestSubscribe = await prompt('\nTest subscription? (y/n): ');
    if (shouldTestSubscribe.toLowerCase() === 'y') {
      await this.testSubscribeToPlan(plans);
    }

    const shouldTestAddOn = await prompt('Test add-ons? (y/n): ');
    if (shouldTestAddOn.toLowerCase() === 'y') {
      await this.testAddAddOn();
    }

    // Test financial features
    await this.testFinancialDashboard();
    await this.testBillingHistory();

    console.log('\n✅ All tests completed!');
    rl.close();
  }
}

// Run the tests
const tester = new SubscriptionTester();
tester.runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  rl.close();
});
