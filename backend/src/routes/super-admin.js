const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { models } = require('../database');
const { authMiddleware, requireSuperAdmin } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get dashboard statistics for super admin
router.get('/dashboard', requireSuperAdmin, async (req, res) => {
  try {
    // Get overall statistics
    const [
      totalCompanies,
      pendingCompanies,
      trialCompanies,
      activeCompanies,
      suspendedCompanies,
      totalUsers,
      totalInvoices,
      totalSales
    ] = await Promise.all([
      models.Company.count(),
      models.Company.count({ where: { subscriptionStatus: 'pending' } }),
      models.Company.count({ where: { subscriptionStatus: 'trial' } }),
      models.Company.count({ where: { subscriptionStatus: 'active' } }),
      models.Company.count({ where: { subscriptionStatus: 'suspended' } }),
      models.User.count({ where: { role: { [models.sequelize.Op.ne]: 'super_admin' } } }),
      models.Invoice.count(),
      models.POSSale.count()
    ]);

    // Get recent companies (last 30 days)
    const recentCompanies = await models.Company.findAll({
      where: {
        createdAt: {
          [models.sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      include: [{
        model: models.User,
        where: { role: 'owner' },
        attributes: ['firstName', 'lastName', 'email'],
        required: true
      }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({
      statistics: {
        totalCompanies,
        pendingCompanies,
        trialCompanies,
        activeCompanies,
        suspendedCompanies,
        totalUsers,
        totalInvoices,
        totalSales
      },
      recentCompanies
    });
  } catch (error) {
    console.error('Super admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get all companies with filtering
router.get('/companies', requireSuperAdmin, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (status && status !== 'all') {
      whereClause.subscriptionStatus = status;
    }

    if (search) {
      whereClause[models.sequelize.Op.or] = [
        { name: { [models.sequelize.Op.iLike]: `%${search}%` } },
        { '$Users.email$': { [models.sequelize.Op.iLike]: `%${search}%` } },
        { '$Users.firstName$': { [models.sequelize.Op.iLike]: `%${search}%` } },
        { '$Users.lastName$': { [models.sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: companies } = await models.Company.findAndCountAll({
      where: whereClause,
      include: [{
        model: models.User,
        where: { role: 'owner' },
        attributes: ['id', 'firstName', 'lastName', 'email', 'lastLoginAt'],
        required: true
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    res.json({
      companies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get company details
router.get('/companies/:id', requireSuperAdmin, async (req, res) => {
  try {
    const company = await models.Company.findByPk(req.params.id, {
      include: [
        {
          model: models.User,
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'lastLoginAt', 'createdAt']
        },
        {
          model: models.Invoice,
          attributes: ['id', 'type', 'status', 'total', 'createdAt'],
          limit: 5,
          order: [['createdAt', 'DESC']]
        },
        {
          model: models.Product,
          attributes: ['id', 'name', 'price', 'stockQuantity'],
          limit: 5
        }
      ]
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get additional stats
    const [totalInvoices, totalRevenue, totalUsers, totalProducts] = await Promise.all([
      models.Invoice.count({ where: { companyId: company.id } }),
      models.Invoice.sum('total', { where: { companyId: company.id, status: 'paid' } }),
      models.User.count({ where: { companyId: company.id } }),
      models.Product.count({ where: { companyId: company.id } })
    ]);

    res.json({
      company,
      stats: {
        totalInvoices,
        totalRevenue: totalRevenue || 0,
        totalUsers,
        totalProducts
      }
    });
  } catch (error) {
    console.error('Get company details error:', error);
    res.status(500).json({ error: 'Failed to fetch company details' });
  }
});

// Grant trial period to a company
router.post('/companies/:id/grant-trial', [
  requireSuperAdmin,
  body('trialDays').isInt({ min: 1, max: 365 }).withMessage('Trial days must be between 1 and 365'),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { trialDays, notes } = req.body;
    const company = await models.Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const trialStartDate = new Date();
    const trialEndDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    // Update company with trial information
    await company.update({
      subscriptionStatus: 'trial',
      settings: {
        ...company.settings,
        trialStartDate,
        trialEndDate,
        trialGrantedBy: req.user.id,
        trialGrantedAt: new Date(),
        trialNotes: notes,
        awaitingTrialApproval: false
      }
    });

    // Log the trial grant action
    console.log(`Super admin ${req.user.email} granted ${trialDays}-day trial to company ${company.name} (${company.id})`);

    res.json({
      message: 'Trial period granted successfully',
      company: {
        id: company.id,
        name: company.name,
        subscriptionStatus: company.subscriptionStatus,
        trialStartDate,
        trialEndDate
      }
    });
  } catch (error) {
    console.error('Grant trial error:', error);
    res.status(500).json({ error: 'Failed to grant trial period' });
  }
});

// Update company subscription status
router.put('/companies/:id/subscription', [
  requireSuperAdmin,
  body('status').isIn(['pending', 'trial', 'active', 'suspended']).withMessage('Invalid subscription status'),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, notes } = req.body;
    const company = await models.Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Update subscription status
    await company.update({
      subscriptionStatus: status,
      settings: {
        ...company.settings,
        statusChangedBy: req.user.id,
        statusChangedAt: new Date(),
        statusChangeNotes: notes
      }
    });

    console.log(`Super admin ${req.user.email} changed company ${company.name} status to ${status}`);

    res.json({
      message: 'Subscription status updated successfully',
      company: {
        id: company.id,
        name: company.name,
        subscriptionStatus: company.subscriptionStatus
      }
    });
  } catch (error) {
    console.error('Update subscription status error:', error);
    res.status(500).json({ error: 'Failed to update subscription status' });
  }
});

// Create super admin user (one-time setup)
router.post('/create-super-admin', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('masterKey').notEmpty().withMessage('Master key is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, masterKey } = req.body;

    // Verify master key (you should set this as an environment variable)
    const expectedMasterKey = process.env.SUPER_ADMIN_MASTER_KEY || 'change-this-master-key-123';
    if (masterKey !== expectedMasterKey) {
      return res.status(403).json({ error: 'Invalid master key' });
    }

    // Check if super admin already exists
    const existingSuperAdmin = await models.User.findOne({ where: { role: 'super_admin' } });
    if (existingSuperAdmin) {
      return res.status(400).json({ error: 'Super admin already exists' });
    }

    // Check if user with email already exists
    const existingUser = await models.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create super admin user (no company needed)
    const superAdmin = await models.User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'super_admin',
      companyId: null, // Super admin doesn't belong to any company
      isActive: true
    });

    console.log(`Super admin created: ${email}`);

    res.status(201).json({
      message: 'Super admin created successfully',
      user: {
        id: superAdmin.id,
        email: superAdmin.email,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        role: superAdmin.role
      }
    });
  } catch (error) {
    console.error('Create super admin error:', error);
    res.status(500).json({ error: 'Failed to create super admin' });
  }
});

// Get system settings
router.get('/settings', requireSuperAdmin, async (req, res) => {
  try {
    // Get system-wide statistics and settings
    const totalCompanies = await models.Company.count();
    const totalUsers = await models.User.count();
    
    // You can store system settings in a separate table or use environment variables
    const systemSettings = {
      defaultTrialDays: parseInt(process.env.DEFAULT_TRIAL_DAYS || '30'),
      maxTrialDays: parseInt(process.env.MAX_TRIAL_DAYS || '365'),
      allowRegistration: process.env.ALLOW_REGISTRATION === 'true',
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      systemVersion: process.env.npm_package_version || '1.0.0'
    };

    res.json({
      statistics: {
        totalCompanies,
        totalUsers
      },
      settings: systemSettings
    });
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// Delete company (soft delete)
router.delete('/companies/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const company = await models.Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Soft delete by updating subscription status
    await company.update({
      subscriptionStatus: 'deleted',
      settings: {
        ...company.settings,
        deletedBy: req.user.id,
        deletedAt: new Date(),
        deleteReason: reason
      }
    });

    // Deactivate all users in the company
    await models.User.update(
      { isActive: false },
      { where: { companyId: company.id } }
    );

    console.log(`Super admin ${req.user.email} deleted company ${company.name} (${company.id}). Reason: ${reason}`);

    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

module.exports = router;
