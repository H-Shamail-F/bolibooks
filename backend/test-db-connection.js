const path = require('path');
const jwt = require('jsonwebtoken');

// Load environment variables from backend directory
require('dotenv').config();

// Import models and database from correct path
const { models, sequelize, initializeDatabase } = require('./src/database');
const { User, Company, Product } = models;

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Initialize database and sync models
    await initializeDatabase();
    console.log('✅ Database initialized and connected successfully');
    
    // Check if tables exist and have data
    const userCount = await User.count();
    const companyCount = await Company.count();
    const productCount = await Product.count();
    
    console.log(`📊 Database statistics:`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Companies: ${companyCount}`);
    console.log(`   Products: ${productCount}`);
    
    if (userCount === 0) {
      console.log('❌ No users found in database. Please seed data first.');
      return;
    }
    
    // Find a user with company info
    const user = await User.findOne({
      include: [{ model: Company }],
      order: [['createdAt', 'DESC']]
    });
    
    if (!user) {
      console.log('❌ No user found with company association');
      return;
    }
    
    console.log(`🎯 Found user: ${user.email} (ID: ${user.id})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Company: ${user.Company ? user.Company.name : 'No company'} (ID: ${user.Company ? user.Company.id : 'N/A'})`);
    
    // Generate a valid JWT token for this user
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.Company ? user.Company.id : null
    };
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '24h'
    });
    
    console.log(`🔑 Generated JWT token:`);
    console.log(token);
    
    // Test the token by decoding it
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log(`✅ Token verification successful:`, decoded);
    
    // Test dashboard stats query manually
    console.log('\n📈 Testing dashboard stats queries...');
    
    // Get total revenue (sum of paid sales)
    const totalRevenue = await sequelize.query(
      `SELECT COALESCE(SUM(total), 0) as total 
       FROM pos_sales 
       WHERE companyId = ? AND status = 'completed'`,
      {
        replacements: [user.Company ? user.Company.id : null],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    // Get total customers (users with customer role in this company)
    const totalCustomers = await User.count({
      where: {
        companyId: user.Company ? user.Company.id : null,
        role: 'customer'
      }
    });
    
    // Get total products
    const totalProducts = await Product.count({
      where: {
        companyId: user.Company ? user.Company.id : null
      }
    });
    
    console.log(`   Total Revenue: $${totalRevenue[0]?.total || 0}`);
    console.log(`   Total Customers: ${totalCustomers}`);
    console.log(`   Total Products: ${totalProducts}`);
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📝 To test the dashboard API, use this token in your Authorization header:');
    console.log(`Bearer ${token}`);
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Error details:', error.message);
    
    if (error.name === 'SequelizeConnectionError') {
      console.log('\n💡 Possible solutions:');
      console.log('1. Make sure the database file exists at backend/database.sqlite');
      console.log('2. Check if the backend server has been started at least once');
      console.log('3. Run database migrations if needed');
    }
  } finally {
    await sequelize.close();
  }
}

// Run the test
testDatabaseConnection();
