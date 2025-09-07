const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_URL || path.join(__dirname, '../../database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: false,
  }
});

// Import all models
const Company = require('../models/Company')(sequelize);
const User = require('../models/User')(sequelize);
const Customer = require('../models/Customer')(sequelize);
const Product = require('../models/Product')(sequelize);
const Invoice = require('../models/Invoice')(sequelize);
const InvoiceItem = require('../models/InvoiceItem')(sequelize);
const Payment = require('../models/Payment')(sequelize);
const Expense = require('../models/Expense')(sequelize);
const Template = require('../models/Template')(sequelize);

// Define associations
const defineAssociations = () => {
  // Company associations
  Company.hasMany(User, { foreignKey: 'companyId' });
  Company.hasMany(Customer, { foreignKey: 'companyId' });
  Company.hasMany(Product, { foreignKey: 'companyId' });
  Company.hasMany(Invoice, { foreignKey: 'companyId' });
  Company.hasMany(Expense, { foreignKey: 'companyId' });
  Company.hasMany(Template, { foreignKey: 'companyId' });

  // User associations
  User.belongsTo(Company, { foreignKey: 'companyId' });
  User.hasMany(Invoice, { foreignKey: 'createdBy' });
  User.hasMany(Expense, { foreignKey: 'createdBy' });

  // Customer associations
  Customer.belongsTo(Company, { foreignKey: 'companyId' });
  Customer.hasMany(Invoice, { foreignKey: 'customerId' });

  // Product associations
  Product.belongsTo(Company, { foreignKey: 'companyId' });
  Product.hasMany(InvoiceItem, { foreignKey: 'productId' });

  // Invoice associations
  Invoice.belongsTo(Company, { foreignKey: 'companyId' });
  Invoice.belongsTo(Customer, { foreignKey: 'customerId' });
  Invoice.belongsTo(User, { as: 'Creator', foreignKey: 'createdBy' });
  Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'items' });
  Invoice.hasMany(Payment, { foreignKey: 'invoiceId' });

  // Invoice Item associations
  InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId' });
  InvoiceItem.belongsTo(Product, { foreignKey: 'productId' });

  // Payment associations
  Payment.belongsTo(Invoice, { foreignKey: 'invoiceId' });
  Payment.belongsTo(Company, { foreignKey: 'companyId' });

  // Expense associations
  Expense.belongsTo(Company, { foreignKey: 'companyId' });
  Expense.belongsTo(User, { as: 'Creator', foreignKey: 'createdBy' });
  Expense.belongsTo(User, { as: 'Approver', foreignKey: 'approvedBy' });

  // Template associations
  Template.belongsTo(Company, { foreignKey: 'companyId' });
  Template.belongsTo(User, { as: 'Creator', foreignKey: 'createdBy' });
  
  // Invoice-Template association
  Invoice.belongsTo(Template, { foreignKey: 'templateId' });
  Template.hasMany(Invoice, { foreignKey: 'templateId' });
};

// Initialize database
const initializeDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Define associations
    defineAssociations();

    // Sync database (create tables if they don't exist)
    await sequelize.sync({ 
      alter: process.env.NODE_ENV === 'development',
      force: process.env.FORCE_DB_SYNC === 'true' 
    });

    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    throw error;
  }
};

// Export database instance and models
module.exports = {
  sequelize,
  initializeDatabase,
  models: {
    Company,
    User,
    Customer,
    Product,
    Invoice,
    InvoiceItem,
    Payment,
    Expense,
    Template
  }
};
