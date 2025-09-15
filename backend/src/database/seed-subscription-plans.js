const { models, sequelize } = require('./index');

const subscriptionPlans = [
  {
    name: 'Starter',
    planTier: 'starter',
    description: 'Perfect for small shops and freelancers just getting started',
    monthlyPrice: 19.00,
    yearlyPrice: 182.40, // 20% discount: $19 * 12 * 0.8
    discountPercentage: 20,
    trialPeriodDays: 14,
    maxUsers: 2,
    maxProducts: 200,
    maxBranches: 1,
    maxStorageGB: 1,
    features: {
      pos: true,
      barcodeScanning: true,
      receipts: true,
      invoicing: 'basic',
      quotes: 'basic',
      payments: ['stripe', 'paypal'],
      inventory: 'basic',
      reporting: 'basic',
      analytics: false,
      profitLoss: false,
      multiLocation: false,
      subscriptionManagement: false,
      roleBasedAccess: false,
      apiAccess: false,
      integrations: [],
      customBranding: false,
      whiteLabel: false,
      prioritySupport: false,
      advancedFinancialReports: false,
      companyIsolation: true
    },
    isActive: true,
    sortOrder: 1,
    stripeProductId: null,
    stripePriceId: null,
    paypalPlanId: null
  },
  {
    name: 'Growth',
    planTier: 'growth',
    description: 'Ideal for small to mid-sized businesses looking to scale',
    monthlyPrice: 39.00,
    yearlyPrice: 374.40, // 20% discount: $39 * 12 * 0.8
    discountPercentage: 20,
    trialPeriodDays: 14,
    maxUsers: 5,
    maxProducts: 2000,
    maxBranches: 3,
    maxStorageGB: 5,
    features: {
      pos: true,
      barcodeScanning: true,
      receipts: true,
      invoicing: 'custom',
      quotes: 'custom',
      payments: ['stripe', 'paypal', 'bml'],
      inventory: 'advanced',
      reporting: 'dashboard',
      analytics: false,
      profitLoss: false,
      multiLocation: true,
      subscriptionManagement: false,
      roleBasedAccess: false,
      apiAccess: false,
      integrations: [],
      customBranding: true,
      whiteLabel: false,
      prioritySupport: false,
      advancedFinancialReports: false,
      companyIsolation: true
    },
    isActive: true,
    sortOrder: 2,
    stripeProductId: null,
    stripePriceId: null,
    paypalPlanId: null
  },
  {
    name: 'Business',
    planTier: 'business',
    description: 'Perfect for growing retailers and service providers',
    monthlyPrice: 79.00,
    yearlyPrice: 758.40, // 20% discount: $79 * 12 * 0.8
    discountPercentage: 20,
    trialPeriodDays: 30,
    maxUsers: 15,
    maxProducts: 10000,
    maxBranches: 5,
    maxStorageGB: 20,
    features: {
      pos: true,
      barcodeScanning: true,
      receipts: true,
      invoicing: 'advanced',
      quotes: 'advanced',
      payments: ['stripe', 'paypal', 'bml'],
      inventory: 'multi-location',
      reporting: 'premium',
      analytics: 'advanced',
      salesAnalytics: true,
      profitLoss: true,
      multiLocation: true,
      subscriptionManagement: true,
      roleBasedAccess: true,
      apiAccess: false,
      integrations: [],
      customBranding: true,
      whiteLabel: false,
      prioritySupport: false,
      advancedFinancialReports: true,
      companyIsolation: true
    },
    isActive: true,
    sortOrder: 3,
    stripeProductId: null,
    stripePriceId: null,
    paypalPlanId: null
  },
  {
    name: 'Enterprise',
    planTier: 'enterprise',
    description: 'For large organizations requiring advanced features and support',
    monthlyPrice: 199.00,
    yearlyPrice: 1910.40, // 20% discount: $199 * 12 * 0.8
    discountPercentage: 20,
    trialPeriodDays: 30,
    maxUsers: -1, // unlimited
    maxProducts: -1, // unlimited
    maxBranches: 5, // 5 included, more via custom pricing
    maxStorageGB: 500,
    features: {
      pos: true,
      barcodeScanning: true,
      receipts: true,
      invoicing: 'advanced',
      quotes: 'advanced',
      payments: ['stripe', 'paypal', 'bml'],
      inventory: 'multi-location',
      reporting: 'premium',
      analytics: 'advanced',
      salesAnalytics: true,
      profitLoss: true,
      multiLocation: true,
      subscriptionManagement: true,
      roleBasedAccess: true,
      apiAccess: true,
      integrations: [],
      customBranding: true,
      whiteLabel: true,
      prioritySupport: true,
      advancedFinancialReports: true,
      companyIsolation: true
    },
    isActive: true,
    sortOrder: 4,
    stripeProductId: null,
    stripePriceId: null,
    paypalPlanId: null
  }
];

async function seedSubscriptionPlans() {
  try {
    console.log('🌱 Seeding subscription plans...');

    // Clear existing plans
    await models.SubscriptionPlan.destroy({ where: {} });
    console.log('   Cleared existing subscription plans');

    // Insert new plans
    for (const planData of subscriptionPlans) {
      const plan = await models.SubscriptionPlan.create(planData);
      console.log(`   ✅ Created ${plan.name} plan - $${plan.monthlyPrice}/mo, $${plan.yearlyPrice}/yr`);
    }

    console.log('\n📊 Subscription Plan Summary:');
    console.log('   Starter:    $19/mo  - Small shops, 2 users, 200 SKUs, 1 branch');
    console.log('   Growth:     $39/mo  - Small-mid businesses, 5 users, 2K SKUs, 3 branches'); 
    console.log('   Business:   $79/mo  - Growing retailers, 15 users, 10K SKUs, 5 branches');
    console.log('   Enterprise: $199/mo - Large organizations, unlimited users, unlimited SKUs, 5 branches');
    console.log('\n💰 Annual Pricing (20% discount):');
    console.log('   Starter:    $182.40/yr (save $45.60)');
    console.log('   Growth:     $374.40/yr (save $93.60)');
    console.log('   Business:   $758.40/yr (save $189.60)');
    console.log('   Enterprise: $1910.40/yr (save $477.60)');

    console.log('\n🎯 Add-on Pricing:');
    console.log('   Extra Users:    $3/user/month');
    console.log('   Extra 1K SKUs:  $5/month');
    console.log('   Extra Branch:   $29/month');
    console.log('   Premium Support: $49/month');

    console.log('\n✅ Subscription plans seeded successfully!');

    return true;
  } catch (error) {
    console.error('❌ Error seeding subscription plans:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  sequelize.authenticate()
    .then(() => seedSubscriptionPlans())
    .then(() => {
      console.log('\n🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedSubscriptionPlans, subscriptionPlans };
