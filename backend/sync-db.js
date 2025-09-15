const { sequelize } = require('./src/database');

async function syncDatabase() {
  try {
    console.log('🔄 Syncing database schema...');
    
    // Force sync to recreate the tables
    await sequelize.sync({ force: true });
    
    console.log('✅ Database schema synced successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing database:', error);
    process.exit(1);
  }
}

syncDatabase();
