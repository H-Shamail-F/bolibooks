#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize, initializeDatabase } = require('../database');
const DatabaseSeeder = require('../seeders');

async function runSeeding() {
  try {
    
    // Initialize and sync database schema via centralized logic
    console.log('🔄 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized.');
    
    const seeder = new DatabaseSeeder();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear') || args.includes('-c');
    const shouldSeedAll = args.includes('--all') || args.includes('-a') || args.length === 0;
    
    if (shouldClear) {
      await seeder.clearDatabase();
    }
    
    if (shouldSeedAll) {
      await seeder.seedAll();
    }
    
    // Show test credentials
    console.log('\n🔐 Test Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin User (BoliBooks Demo Store):');
    console.log('  Email: admin@bolivooks.com');
    console.log('  Password: admin123');
    console.log('  Features: All features enabled (Professional plan)');
    console.log('');
    console.log('Manager User:');
    console.log('  Email: manager@bolivooks.com');
    console.log('  Password: manager123');
    console.log('  Features: POS, Inventory, Reports');
    console.log('');
    console.log('Cashier User:');
    console.log('  Email: cashier@bolivooks.com');
    console.log('  Password: cashier123');
    console.log('  Features: POS only');
    console.log('');
    console.log('Small Business Owner:');
    console.log('  Email: owner@smallbiz.com');
    console.log('  Password: owner123');
    console.log('  Features: Starter plan limitations');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🌐 You can now login at:');
    console.log('  Frontend: http://localhost:3000');
    console.log('  Backend API: http://localhost:5000');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Handle command line help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('📚 Database Seeding Script');
  console.log('');
  console.log('Usage: node src/scripts/seed.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --all, -a     Seed all data (default)');
  console.log('  --clear, -c   Clear existing data before seeding');
  console.log('  --help, -h    Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node src/scripts/seed.js                 # Seed all data');
  console.log('  node src/scripts/seed.js --clear --all   # Clear and reseed');
  console.log('  node src/scripts/seed.js -c -a           # Same as above');
  process.exit(0);
}

runSeeding();
