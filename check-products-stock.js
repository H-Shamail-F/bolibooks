const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'backend/database.db'),
  logging: false
});

async function checkProductsStock() {
  try {
    const [results] = await sequelize.query(`
      SELECT name, stockQuantity, trackInventory, companyId, isActive
      FROM Products
      WHERE companyId = 'ed3f92b7-efa4-4a9d-9d75-9ca0139c6208'
      ORDER BY name
    `);
    
    console.log('Products stock status for company ed3f92b7-efa4-4a9d-9d75-9ca0139c6208:');
    console.table(results);
    
    const availableForPOS = results.filter(p => 
      p.isActive && (!p.trackInventory || p.stockQuantity > 0)
    );
    
    console.log(`\nProducts available for POS: ${availableForPOS.length}`);
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkProductsStock().catch(console.error);
