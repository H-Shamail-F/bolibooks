const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'backend/database.db'),
  logging: false
});

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log('📊 Checking database users...\n');

    // Query users table directly
    const [results] = await sequelize.query(`
      SELECT u.id, u.name, u.email, u.role, u.isActive, 
             c.name as companyName, c.id as companyId
      FROM Users u 
      LEFT JOIN Companies c ON u.companyId = c.id
      ORDER BY u.id
    `);

    console.log('Users found:');
    console.table(results);

    // Also check companies
    const [companies] = await sequelize.query(`
      SELECT id, name, email, subscriptionStatus, createdAt
      FROM Companies
      ORDER BY id
    `);

    console.log('\nCompanies found:');
    console.table(companies);

    // Check a few products as well
    const [products] = await sequelize.query(`
      SELECT id, name, sku, price, stockQuantity, companyId
      FROM Products 
      LIMIT 5
    `);

    console.log('\nSample products:');
    console.table(products);

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await sequelize.close();
  }
}

checkUsers().catch(console.error);
