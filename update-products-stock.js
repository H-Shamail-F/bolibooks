const { initializeDatabase } = require('./backend/src/database');

async function updateProductsStock() {
  console.log('🔄 Updating products stock...');
  
  try {
    const db = await initializeDatabase();
    const { models } = require('./backend/src/database');
    
    // Update all products to have stock
    const [updatedCount] = await models.Product.update({
      stockQuantity: 50,
      lowStockThreshold: 5
    }, {
      where: {
        // Update all products
      }
    });
    
    console.log(`✅ Updated stock for ${updatedCount} products`);
    
    // List products after update
    const products = await models.Product.findAll({
      attributes: ['name', 'stockQuantity', 'trackInventory', 'isActive', 'companyId'],
      limit: 10
    });
    
    console.log('\nProducts after stock update:');
    products.forEach(product => {
      console.log(`- ${product.name}: Stock ${product.stockQuantity} (Track: ${product.trackInventory}, Active: ${product.isActive})`);
    });
    
    console.log('\n✅ Stock update completed!');
    
  } catch (error) {
    console.error('❌ Error updating stock:', error);
  }
}

updateProductsStock().catch(console.error);
