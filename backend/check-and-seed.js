const { models, initializeDatabase } = require('./src/database');

async function checkAndSeedDatabase() {
  try {
    await initializeDatabase();
    console.log('✅ Database initialized');

    // Check existing data
    const users = await models.User.findAll({ include: models.Company });
    const companies = await models.Company.findAll();
    const subscriptions = await models.SubscriptionPlan.findAll();

    console.log(`📊 Current data:`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Companies: ${companies.length}`);
    console.log(`   Subscription plans: ${subscriptions.length}`);

    if (users.length > 0) {
      console.log('\n👥 Existing users:');
      users.forEach(u => {
        console.log(`   - ${u.email} (Company: ${u.Company?.name || 'None'}, Status: ${u.Company?.subscriptionStatus || 'None'})`);
      });
    }

    // Seed subscription plans if none exist
    if (subscriptions.length === 0) {
      console.log('\n🌱 Seeding subscription plans...');
      
      const plans = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Starter',
          planTier: 'starter',
          monthlyPrice: 9.99,
          yearlyPrice: 99.99,
          features: JSON.stringify({
            maxUsers: 1,
            maxProducts: 100,
            maxBranches: 1,
            maxStorage: 1, // GB
            canUseAdvancedReports: false,
            canUseMultiCurrency: false,
            canUseAPI: false,
            support: 'basic'
          }),
          addOns: JSON.stringify([]),
          isActive: true,
          sortOrder: 1
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Growth',
          planTier: 'growth',
          monthlyPrice: 29.99,
          yearlyPrice: 299.99,
          features: JSON.stringify({
            maxUsers: 5,
            maxProducts: 500,
            maxBranches: 3,
            maxStorage: 5, // GB
            canUseAdvancedReports: true,
            canUseMultiCurrency: false,
            canUseAPI: false,
            support: 'priority'
          }),
          addOns: JSON.stringify([]),
          isActive: true,
          sortOrder: 2
        }
      ];

      for (const plan of plans) {
        await models.SubscriptionPlan.create(plan);
        console.log(`   ✅ Created plan: ${plan.name}`);
      }
    }

    // Create demo user if no active users
    const activeUsers = users.filter(u => u.Company?.subscriptionStatus === 'active');
    if (activeUsers.length === 0) {
      console.log('\n👤 Creating demo user with active subscription...');
      
      const bcrypt = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');

      // Get starter plan
      const starterPlan = await models.SubscriptionPlan.findOne({ where: { planTier: 'starter' } });
      
      // Create demo company
      const company = await models.Company.create({
        id: uuidv4(),
        name: 'Demo Company Ltd',
        email: 'demo@example.com',
        phone: '+1234567890',
        address: '123 Demo Street, Demo City, DC 12345',
        subscriptionStatus: 'active',
        subscriptionPlanId: starterPlan.id,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        settings: JSON.stringify({
          currency: 'USD',
          gstRate: 8.0,
          fiscalYearStart: '01-01',
          invoicePrefix: 'INV-',
          quotePrefix: 'QUO-',
          timezone: 'America/New_York'
        })
      });

      // Create demo user
      const hashedPassword = await bcrypt.hash('demo123', 10);
      const user = await models.User.create({
        id: uuidv4(),
        companyId: company.id,
        email: 'demo@example.com',
        password: hashedPassword,
        firstName: 'Demo',
        lastName: 'User',
        role: 'owner',
        status: 'active'
      });

      console.log(`   ✅ Created demo company: ${company.name}`);
      console.log(`   ✅ Created demo user: ${user.email}`);
      console.log(`   🔑 Demo credentials: demo@example.com / demo123`);
    }

    console.log('\n✅ Database check and seed completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAndSeedDatabase();
