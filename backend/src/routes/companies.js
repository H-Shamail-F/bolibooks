const express = require('express');
const { body, validationResult } = require('express-validator');
const { models } = require('../database');
const { authMiddleware, requireOwner } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/logos/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.companyId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get company profile
router.get('/profile', async (req, res) => {
  try {
    const company = await models.Company.findByPk(req.user.companyId);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    console.error('Error fetching company profile:', error);
    res.status(500).json({ error: 'Failed to fetch company profile' });
  }
});

// Update company profile
router.put('/profile', [
  body('name').optional().notEmpty().withMessage('Company name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  body('website').optional().isURL().withMessage('Valid website URL is required'),
  body('currency').optional().isIn(['USD', 'MVR', 'EUR', 'GBP', 'INR']).withMessage('Invalid currency'),
  body('gstRate').optional().isNumeric().withMessage('GST rate must be numeric'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const company = await models.Company.findByPk(req.user.companyId);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Only owners can update certain sensitive fields
    if (req.user.role !== 'owner') {
      const restrictedFields = ['subscriptionStatus', 'subscriptionPlan', 'maxUsers', 'maxInvoicesPerMonth'];
      const hasRestrictedFields = restrictedFields.some(field => req.body.hasOwnProperty(field));
      
      if (hasRestrictedFields) {
        return res.status(403).json({ error: 'Insufficient permissions to update subscription settings' });
      }
    }

    await company.update(req.body);
    res.json(company);
  } catch (error) {
    console.error('Error updating company profile:', error);
    res.status(500).json({ error: 'Failed to update company profile' });
  }
});

// Upload company logo
router.post('/logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file provided' });
    }

    const company = await models.Company.findByPk(req.user.companyId);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Delete old logo if it exists
    if (company.logo) {
      try {
        await fs.unlink(path.join('uploads/logos/', path.basename(company.logo)));
      } catch (error) {
        console.log('Old logo file not found or already deleted');
      }
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    await company.update({ logo: logoUrl });

    res.json({
      message: 'Logo uploaded successfully',
      logoUrl: logoUrl
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Get company subscription info
router.get('/subscription', async (req, res) => {
  try {
    const company = await models.Company.findByPk(req.user.companyId, {
      attributes: [
        'subscriptionStatus',
        'subscriptionPlan',
        'subscriptionEndDate',
        'maxUsers',
        'maxInvoicesPerMonth',
        'settings'
      ]
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get current usage statistics
    const userCount = await models.User.count({
      where: { companyId: req.user.companyId, isActive: true }
    });

    const currentMonth = new Date();
    currentMonth.setDate(1);
    const invoiceCount = await models.Invoice.count({
      where: { 
        companyId: req.user.companyId,
        createdAt: { [models.sequelize.Op.gte]: currentMonth }
      }
    });

    res.json({
      subscription: {
        status: company.subscriptionStatus,
        plan: company.subscriptionPlan,
        endDate: company.subscriptionEndDate,
        limits: {
          maxUsers: company.maxUsers,
          maxInvoicesPerMonth: company.maxInvoicesPerMonth
        },
        usage: {
          currentUsers: userCount,
          currentMonthInvoices: invoiceCount
        },
        trialInfo: company.settings.trialStartDate ? {
          startDate: company.settings.trialStartDate,
          endDate: company.settings.trialEndDate
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching subscription info:', error);
    res.status(500).json({ error: 'Failed to fetch subscription info' });
  }
});

// Update subscription (owner only)
router.put('/subscription', [requireOwner], async (req, res) => {
  try {
    const { subscriptionPlan, subscriptionEndDate } = req.body;

    const company = await models.Company.findByPk(req.user.companyId);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const updateData = {};
    
    if (subscriptionPlan) {
      updateData.subscriptionPlan = subscriptionPlan;
      updateData.subscriptionStatus = 'active';
      
      // Set limits based on plan
      switch (subscriptionPlan) {
        case 'basic':
          updateData.maxUsers = 5;
          updateData.maxInvoicesPerMonth = 100;
          break;
        case 'professional':
          updateData.maxUsers = 15;
          updateData.maxInvoicesPerMonth = 500;
          break;
        case 'enterprise':
          updateData.maxUsers = 50;
          updateData.maxInvoicesPerMonth = 2000;
          break;
      }
    }

    if (subscriptionEndDate) {
      updateData.subscriptionEndDate = new Date(subscriptionEndDate);
    }

    await company.update(updateData);
    res.json({ message: 'Subscription updated successfully', company });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Get company users (admin and owner only)
router.get('/users', async (req, res) => {
  try {
    if (!['owner', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const users = await models.User.findAll({
      where: { companyId: req.user.companyId },
      attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'lastLoginAt', 'createdAt']
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching company users:', error);
    res.status(500).json({ error: 'Failed to fetch company users' });
  }
});

// Update user role (owner only)
router.put('/users/:userId/role', [requireOwner], async (req, res) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    if (!['user', 'admin', 'owner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await models.User.findOne({
      where: { id: userId, companyId: req.user.companyId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent changing own role
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    await user.update({ role });
    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Enable/disable customer portal
router.put('/portal/settings', async (req, res) => {
  try {
    const { portalEnabled, customDomain, portalBranding } = req.body;

    const company = await models.Company.findByPk(req.user.companyId);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const settings = { ...company.settings };
    
    if (typeof portalEnabled === 'boolean') {
      settings.portalEnabled = portalEnabled;
    }
    
    if (customDomain) {
      settings.customDomain = customDomain;
    }
    
    if (portalBranding) {
      settings.portal = { ...settings.portal, ...portalBranding };
    }

    await company.update({ settings });
    res.json({ message: 'Portal settings updated successfully', settings });
  } catch (error) {
    console.error('Error updating portal settings:', error);
    res.status(500).json({ error: 'Failed to update portal settings' });
  }
});

module.exports = router;
