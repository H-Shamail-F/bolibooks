const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initializeDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const customerRoutes = require('./routes/customers');
const productRoutes = require('./routes/products');
const invoiceRoutes = require('./routes/invoices');
const paymentRoutes = require('./routes/payments');
const expenseRoutes = require('./routes/expenses');
const reportRoutes = require('./routes/reports');
const financialReportRoutes = require('./routes/financial-reports');
const uploadRoutes = require('./routes/uploads');
const portalRoutes = require('./routes/portal');
const templateRoutes = require('./routes/templates');
const posRoutes = require('./routes/pos');
const bmlRoutes = require('./routes/bml');
const superAdminRoutes = require('./routes/super-admin');
const subscriptionRoutes = require('./routes/subscriptions');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy setting for rate limiting
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting (only in production to avoid X-Forwarded-For issues in dev)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);
  console.log('✅ Rate limiting enabled for production');
} else {
  console.log('⚠️  Rate limiting disabled in development mode');
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', companyRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments/bml', bmlRoutes); // Mount BML before generic payments
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/financial-reports', financialReportRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connectivity
    const { sequelize } = require('./database');
    await sequelize.authenticate();
    
    res.json({ 
      status: 'OK', 
      message: 'BoliBooks API is running',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    const server = app.listen(PORT, () => {
      console.log(`🚀 BoliBooks API server running on port ${PORT}`);
      console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
}

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;

// Note: The provided code block "proxy": "http://localhost:5000" is not relevant to this file.
// It is likely meant for a configuration file like package.json.
