const bcrypt = require('bcryptjs');
const { models } = require('../database');
const { User, Company, SubscriptionPlan, Product, Template } = models;
const BarcodeUtils = require('../utils/barcodeUtils');

class DatabaseSeeder {
  constructor() {
    this.users = [];
    this.companies = [];
    this.subscriptionPlans = [];
    this.products = [];
  }

  async seedAll() {
    try {
      console.log('🌱 Starting database seeding...');
      
      await this.seedSubscriptionPlans();
      await this.seedCompanies();
      await this.seedUsers();
      await this.seedProducts();
      await this.seedTemplates();
      
      console.log('✅ Database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  async seedSubscriptionPlans() {
    console.log('Creating subscription plans...');
    
    const plans = [
      {
        name: 'Starter',
        price: 29.99,
        billingPeriod: 'monthly',
        maxUsers: 2,
        maxProducts: 100,
        features: {
          pos: true,
          inventory: true,
          invoicing: true,
          reporting: 'basic',
          barcode: true,
          multiLocation: false,
          advancedReports: false,
          apiAccess: false,
          customBranding: false
        },
        description: 'Perfect for small businesses just getting started'
      },
      {
        name: 'Professional',
        price: 79.99,
        billingPeriod: 'monthly',
        maxUsers: 10,
        maxProducts: 1000,
        features: {
          pos: true,
          inventory: true,
          invoicing: true,
          reporting: 'advanced',
          barcode: true,
          multiLocation: true,
          advancedReports: true,
          apiAccess: true,
          customBranding: false
        },
        description: 'For growing businesses that need more features'
      },
      {
        name: 'Enterprise',
        price: 199.99,
        billingPeriod: 'monthly',
        maxUsers: -1, // unlimited
        maxProducts: -1, // unlimited
        features: {
          pos: true,
          inventory: true,
          invoicing: true,
          reporting: 'premium',
          barcode: true,
          multiLocation: true,
          advancedReports: true,
          apiAccess: true,
          customBranding: true
        },
        description: 'Complete solution for large enterprises'
      },
      {
        name: 'Free Trial',
        price: 0,
        billingPeriod: 'monthly',
        maxUsers: 1,
        maxProducts: 10,
        features: {
          pos: true,
          inventory: true,
          invoicing: false,
          reporting: 'basic',
          barcode: false,
          multiLocation: false,
          advancedReports: false,
          apiAccess: false,
          customBranding: false
        },
        description: '14-day free trial to explore basic features'
      }
    ];

    for (const planData of plans) {
      const [plan, created] = await SubscriptionPlan.findOrCreate({
        where: { name: planData.name },
        defaults: planData
      });
      
      this.subscriptionPlans.push(plan);
      if (created) {
        console.log(`  ✓ Created subscription plan: ${plan.name}`);
      }
    }
  }

  async seedCompanies() {
    console.log('Creating test companies...');
    
    const companiesData = [
      {
        name: 'BoliBooks Demo Store',
        email: 'admin@bolivooks-demo.com',
        phone: '+1-555-0123',
        address: '123 Main Street, Demo City, DC 12345',
        website: 'https://bolivooks-demo.com',
        logo: null,
        subscriptionPlanId: this.subscriptionPlans.find(p => p.name === 'Professional').id,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        settings: {
          currency: 'USD',
          timeZone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          defaultTax: 8.5,
          lowStockThreshold: 10
        }
      },
      {
        name: 'Small Business Test',
        email: 'owner@smallbiz.com',
        phone: '+1-555-0456',
        address: '456 Small St, Startup City, SC 67890',
        subscriptionPlanId: this.subscriptionPlans.find(p => p.name === 'Starter').id,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        settings: {
          currency: 'USD',
          timeZone: 'America/Los_Angeles',
          dateFormat: 'DD/MM/YYYY',
          defaultTax: 7.25,
          lowStockThreshold: 5
        }
      }
    ];

    for (const companyData of companiesData) {
      const [company, created] = await Company.findOrCreate({
        where: { email: companyData.email },
        defaults: companyData
      });
      
      this.companies.push(company);
      if (created) {
        console.log(`  ✓ Created company: ${company.name}`);
      }
    }
  }

  async seedUsers() {
    console.log('Creating test users...');
    
    const usersData = [
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@bolivooks.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        companyId: this.companies[0].id,
        isActive: true,
        permissions: ['all']
      },
      {
        firstName: 'Manager',
        lastName: 'Smith',
        email: 'manager@bolivooks.com',
        password: await bcrypt.hash('manager123', 10),
        role: 'manager',
        companyId: this.companies[0].id,
        isActive: true,
        permissions: ['pos', 'inventory', 'reports']
      },
      {
        firstName: 'Cashier',
        lastName: 'Johnson',
        email: 'cashier@bolivooks.com',
        password: await bcrypt.hash('cashier123', 10),
        role: 'cashier',
        companyId: this.companies[0].id,
        isActive: true,
        permissions: ['pos']
      },
      {
        firstName: 'Small Biz',
        lastName: 'Owner',
        email: 'owner@smallbiz.com',
        password: await bcrypt.hash('owner123', 10),
        role: 'admin',
        companyId: this.companies[1].id,
        isActive: true,
        permissions: ['all']
      },
      {
        firstName: 'Test',
        lastName: 'Cashier',
        email: 'testcashier@smallbiz.com',
        password: await bcrypt.hash('test123', 10),
        role: 'cashier',
        companyId: this.companies[1].id,
        isActive: true,
        permissions: ['pos']
      }
    ];

    for (const userData of usersData) {
      const [user, created] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: userData
      });
      
      this.users.push(user);
      if (created) {
        console.log(`  ✓ Created user: ${user.firstName} ${user.lastName} (${user.role})`);
      }
    }
  }

  async seedProducts() {
    console.log('Creating sample products...');
    
    const productsData = [
      {
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless optical mouse',
        sku: 'WM001',
        price: 29.99,
        cost: 15.00,
        category: 'Electronics',
        stock: 50,
        minStock: 10,
        maxStock: 100,
        companyId: this.companies[0].id,
        trackInventory: true,
        isActive: true
      },
      {
        name: 'USB-C Cable',
        description: '6ft USB-C to USB-A charging cable',
        sku: 'USB001',
        price: 12.99,
        cost: 6.50,
        category: 'Electronics',
        stock: 75,
        minStock: 15,
        maxStock: 150,
        companyId: this.companies[0].id,
        trackInventory: true,
        isActive: true
      },
      {
        name: 'Bluetooth Speaker',
        description: 'Portable wireless bluetooth speaker',
        sku: 'BS001',
        price: 49.99,
        cost: 25.00,
        category: 'Electronics',
        stock: 30,
        minStock: 5,
        maxStock: 50,
        companyId: this.companies[0].id,
        trackInventory: true,
        isActive: true
      },
      {
        name: 'Phone Case',
        description: 'Protective silicone phone case',
        sku: 'PC001',
        price: 19.99,
        cost: 8.00,
        category: 'Accessories',
        stock: 100,
        minStock: 20,
        maxStock: 200,
        companyId: this.companies[0].id,
        trackInventory: true,
        isActive: true
      },
      {
        name: 'Coffee Mug',
        description: 'Ceramic coffee mug 12oz',
        sku: 'CM001',
        price: 8.99,
        cost: 3.50,
        category: 'Kitchenware',
        stock: 25,
        minStock: 5,
        maxStock: 75,
        companyId: this.companies[1].id,
        trackInventory: true,
        isActive: true
      }
    ];

    for (const productData of productsData) {
      const [product, created] = await Product.findOrCreate({
        where: { 
          sku: productData.sku,
          companyId: productData.companyId 
        },
        defaults: {
          ...productData,
          barcode: BarcodeUtils.generateCode128('POS')
        }
      });
      
      this.products.push(product);
      if (created) {
        console.log(`  ✓ Created product: ${product.name} (${product.sku})`);
      }
    }
  }

  async seedTemplates() {
    console.log('Creating receipt templates...');
    
    const templatesData = [
      {
        name: 'Default POS Receipt',
        type: 'pos',
        htmlTemplate: [
          '<div class="pos-receipt">',
          '<div class="header">',
          '<h2>{{company_name}}</h2>',
          '<p>{{company_address}}</p>',
          '<p>{{company_phone}}</p>',
          '</div>',
          '<div class="receipt-info">',
          '<p>Receipt #: {{document_number}}</p>',
          '<p>Date: {{document_date}}</p>',
          '<p>Cashier: {{cashier_name}}</p>',
          '</div>',
          '<div class="items">',
          '{{items_table}}',
          '</div>',
          '<div class="totals">',
          '<p>Subtotal: {{currency}}{{subtotal}}</p>',
          '<p>Tax ({{tax_rate}}%): {{currency}}{{tax_amount}}</p>',
          '<p class="total"><strong>TOTAL: {{currency}}{{total_amount}}</strong></p>',
          '</div>',
          '<div class="payment">',
          '<p>Payment: {{payment_method}}</p>',
          '<p>Change: {{currency}}{{change_amount}}</p>',
          '</div>',
          '<div class="footer">',
          '<p>Thank you for your business!</p>',
          '<p>{{company_website}}</p>',
          '</div>',
          '</div>'
        ].join('\n'),
        cssStyles: [
          '.pos-receipt { font-family: monospace; width: 80mm; margin: 0 auto; }',
          '.header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; }',
          '.header h2 { margin: 0; font-size: 18px; }',
          '.receipt-info, .totals, .payment { margin: 10px 0; }',
          '.items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; }',
          '.total { font-size: 16px; }',
          '.footer { text-align: center; margin-top: 20px; font-size: 12px; }'
        ].join('\n'),
        isDefault: true,
        companyId: this.companies[0].id
      }
    ];

    for (const templateData of templatesData) {
      const [template, created] = await Template.findOrCreate({
        where: { 
          name: templateData.name,
          companyId: templateData.companyId 
        },
        defaults: templateData
      });
      
      if (created) {
        console.log(`  ✓ Created template: ${template.name}`);
      }
    }
  }

  async clearDatabase() {
    console.log('🗑️ Clearing existing data...');
    
    // Clear in reverse dependency order
    await Template.destroy({ where: {}, force: true });
    await Product.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Company.destroy({ where: {}, force: true });
    await SubscriptionPlan.destroy({ where: {}, force: true });
    
    console.log('✅ Database cleared');
  }
}

module.exports = DatabaseSeeder;
