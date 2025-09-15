const { initializeDatabase } = require('./index');
const { seedSubscriptionPlans } = require('./seed-subscription-plans');

async function runSeed() {
  try {
    console.log('🚀 Starting database seeding...');
    
    // Initialize database first
    await initializeDatabase();
    
    // Seed subscription plans
    await seedSubscriptionPlans();
    
    console.log('✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
