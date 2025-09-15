const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initializeDatabase } = require('./database');

// Enhanced logging utility
const logger = {
  info: (message, ...args) => console.log(`[${new Date().toISOString()}] ℹ️  ${message}`, ...args),
  error: (message, ...args) => console.error(`[${new Date().toISOString()}] ❌ ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[${new Date().toISOString()}] ⚠️  ${message}`, ...args),
  success: (message, ...args) => console.log(`[${new Date().toISOString()}] ✅ ${message}`, ...args)
};

class BoliBookServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.port = process.env.PORT || 5000;
    this.loadedRoutes = [];
    this.failedRoutes = [];
    this.isShuttingDown = false;
  }

  setupMiddleware() {
    logger.info('Setting up middleware...');
    
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: { error: 'Too many requests from this IP, please try again later.' }
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware with error handling
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        try {
          JSON.parse(buf);
        } catch (e) {
          res.status(400).json({ error: 'Invalid JSON in request body' });
          return false;
        }
      }
    }));
    
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static files
    this.app.use('/uploads', express.static('uploads'));

    logger.success('Middleware setup completed');
  }

  setupBasicRoutes() {
    // Health check endpoint with detailed information
    this.app.get('/api/health', (req, res) => {
      const healthStatus = {
        status: 'OK',
        message: 'BoliBooks API is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        loadedRoutes: this.loadedRoutes.length,
        failedRoutes: this.failedRoutes.length,
        environment: process.env.NODE_ENV || 'development'
      };
      res.json(healthStatus);
    });

    // Server status endpoint
    this.app.get('/api/status', (req, res) => {
      res.json({
        status: 'OK',
        loadedRoutes: this.loadedRoutes,
        failedRoutes: this.failedRoutes,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // API documentation endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'BoliBooks API',
        version: '1.0.0',
        description: 'Point of Sale and Business Management API',
        endpoints: {
          health: '/api/health',
          status: '/api/status',
          auth: '/api/auth/*',
          products: '/api/products/*',
          pos: '/api/pos/*',
          companies: '/api/companies/*',
          customers: '/api/customers/*',
          reports: '/api/reports/*',
          payments: '/api/payments/*',
          'payments-enhanced': '/api/payments-enhanced/*',
          paypal: '/api/paypal/*',
          'subscription-plans': '/api/subscription-plans/*'
        },
        loadedRoutes: this.loadedRoutes,
        documentation: 'https://github.com/your-repo/bolibooks-api'
      });
    });
  }

  async loadRoutes() {
    logger.info('Loading API routes...');

    const routes = [
      { path: '/api/auth', file: './routes/auth', critical: true },
      { path: '/api/companies', file: './routes/companies', critical: false },
      { path: '/api/customers', file: './routes/customers', critical: false },
      { path: '/api/products', file: './routes/products', critical: true },
      { path: '/api/invoices', file: './routes/invoices', critical: false },
      { path: '/api/payments', file: './routes/payments', critical: false },
      { path: '/api/payments-enhanced', file: './routes/payments-enhanced', critical: false },
      { path: '/api/paypal', file: './routes/paypal', critical: false },
      { path: '/api/expenses', file: './routes/expenses', critical: false },
      { path: '/api/reports', file: './routes/reports', critical: false },
      { path: '/api/uploads', file: './routes/uploads', critical: false },
      { path: '/api/portal', file: './routes/portal', critical: false },
      { path: '/api/templates', file: './routes/templates', critical: false },
      { path: '/api/pos', file: './routes/pos', critical: false },
      { path: '/api/subscription-plans', file: './routes/subscription-plans', critical: false }
    ];

    let criticalFailures = 0;

    for (const { path, file, critical } of routes) {
      try {
        const routeModule = require(file);
        
        // Validate that the module exports a router
        if (typeof routeModule !== 'function' && typeof routeModule.use !== 'function') {
          throw new Error('Route module does not export a valid Express router');
        }

        this.app.use(path, routeModule);
        this.loadedRoutes.push(path);
        logger.success(`Loaded route: ${path}`);
      } catch (error) {
        const errorInfo = { path, error: error.message, critical };
        this.failedRoutes.push(errorInfo);
        
        if (critical) {
          criticalFailures++;
          logger.error(`CRITICAL: Failed to load route ${path}: ${error.message}`);
        } else {
          logger.warn(`Failed to load route ${path}: ${error.message}`);
        }
      }
    }

    logger.info(`Route loading completed: ${this.loadedRoutes.length} loaded, ${this.failedRoutes.length} failed`);

    if (criticalFailures > 0) {
      throw new Error(`${criticalFailures} critical routes failed to load. Server cannot start safely.`);
    }
  }

  setupErrorHandling() {
    // Request logging middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        if (res.statusCode >= 400) {
          logger.warn(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
        }
      });
      next();
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
      res.status(404).json({ 
        error: 'Route not found',
        method: req.method,
        url: req.originalUrl,
        availableRoutes: this.loadedRoutes
      });
    });

    // Global error handler
    this.app.use((err, req, res, next) => {
      logger.error('Unhandled error:', err.stack);
      
      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(err.status || 500).json({
        error: isDevelopment ? err.message : 'Something went wrong!',
        ...(isDevelopment && { stack: err.stack }),
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      });
    });
  }

  async initializeDatabase() {
    logger.info('Initializing database...');
    try {
      await initializeDatabase();
      logger.success('Database initialized successfully');
    } catch (error) {
      logger.error('Database initialization failed:', error.message);
      throw error;
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}, initiating graceful shutdown...`);
      
      if (this.isShuttingDown) {
        logger.warn('Shutdown already in progress, forcing exit');
        process.exit(1);
      }
      
      this.isShuttingDown = true;

      // Stop accepting new connections
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            logger.error('Error during server shutdown:', err);
            process.exit(1);
          }
          logger.success('Server closed successfully');
          process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
          logger.error('Forced shutdown due to timeout');
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }

  async start() {
    try {
      logger.info('Starting BoliBooks API Server...');

      // Initialize database first
      await this.initializeDatabase();

      // Setup middleware
      this.setupMiddleware();

      // Setup basic routes
      this.setupBasicRoutes();

      // Load API routes
      await this.loadRoutes();

      // Setup error handling (must be last)
      this.setupErrorHandling();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Start server
      this.server = this.app.listen(this.port, () => {
        logger.success(`🚀 BoliBooks API server running on port ${this.port}`);
        logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`✅ Loaded ${this.loadedRoutes.length} routes successfully`);
        
        if (this.failedRoutes.length > 0) {
          logger.warn(`⚠️  ${this.failedRoutes.length} non-critical routes failed to load`);
        }

        logger.info(`🌐 API available at: http://localhost:${this.port}`);
        logger.info(`🏥 Health check: http://localhost:${this.port}/api/health`);
      });

      // Handle server errors
      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          logger.error(`Port ${this.port} is already in use`);
          process.exit(1);
        } else {
          logger.error('Server error:', err);
          throw err;
        }
      });

    } catch (error) {
      logger.error('Failed to start server:', error.message);
      process.exit(1);
    }
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new BoliBookServer();
  server.start();
}

module.exports = BoliBookServer;
