const express = require('express');
const { body, validationResult } = require('express-validator');
const { models } = require('../database');
const { authMiddleware, requireOwner } = require('../middleware/auth');
const router = express.Router();

// Note: /plans route doesn't require auth, apply middleware selectively

// Get all available subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await models.SubscriptionPlan.findAll({
      where: { isActive: true },
      attributes: [
        'id', 'name', 'planTier', 'description', 'monthlyPrice', 'yearlyPrice', 
        'discountPercentage', 'maxUsers', 'maxProducts', 'maxBranches', 
        'maxStorageGB', 'features', 'trialPeriodDays', 'sortOrder'
      ],
      order: [['sortOrder', 'ASC']]
    });

    // Calculate savings for each plan
    const plansWithSavings = plans.map(plan => ({
      ...plan.toJSON(),
      yearlySavings: plan.getYearlySavings(),
      effectiveMonthlyPrice: plan.getEffectiveMonthlyPrice(true)
    }));

    res.json({
      success: true,
      data: {
        plans: plansWithSavings,
        addOnPricing: {
          extraUser: 3.00,
          extraThousandSKUs: 5.00,
          extraBranch: 29.00,
          premiumSupport: 49.00
        }
      }
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans'
    });
  }
});

// Get current company subscription
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const company = await models.Company.findByPk(req.user.companyId, {
      include: [{
        model: models.SubscriptionPlan,
        required: false
      }]
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Get usage statistics
    const [userCount, productCount, branchCount] = await Promise.all([
      models.User.count({ where: { companyId: company.id, isActive: true } }),
      models.Product.count({ where: { companyId: company.id, isActive: true } }),
      // For now, branch count is 1 (can be expanded later)
      Promise.resolve(1)
    ]);

    const subscriptionInfo = {
      company: {
        id: company.id,
        name: company.name,
        subscriptionStatus: company.subscriptionStatus,
        subscriptionPlan: company.SubscriptionPlan?.name || null,
        planTier: company.SubscriptionPlan?.planTier || null,
        billingPeriod: company.settings?.billingPeriod || 'monthly',
        subscriptionEndDate: company.settings?.subscriptionEndDate || null,
        trialEndDate: company.settings?.trialEndDate || null
      },
      usage: {
        users: userCount,
        products: productCount,
        branches: branchCount,
        storageGB: 0 // Can be calculated based on file uploads
      },
      limits: company.SubscriptionPlan ? {
        maxUsers: company.SubscriptionPlan.maxUsers,
        maxProducts: company.SubscriptionPlan.maxProducts,
        maxBranches: company.SubscriptionPlan.maxBranches,
        maxStorageGB: company.SubscriptionPlan.maxStorageGB
      } : null,
      features: company.SubscriptionPlan?.features || {},
      nextBillingDate: company.settings?.nextBillingDate || null,
      addOns: company.settings?.addOns || []
    };

    res.json({
      success: true,
      data: subscriptionInfo
    });
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription information'
    });
  }
});

// Subscribe to a plan
router.post('/subscribe', [
  authMiddleware,
  requireOwner,
  body('planId').isUUID().withMessage('Valid plan ID is required'),
  body('billingPeriod').isIn(['monthly', 'yearly']).withMessage('Billing period must be monthly or yearly'),
  body('paymentMethodId').optional().isString().withMessage('Payment method ID must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { planId, billingPeriod, paymentMethodId } = req.body;

    // Get the plan
    const plan = await models.SubscriptionPlan.findByPk(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found or inactive'
      });
    }

    // Get the company
    const company = await models.Company.findByPk(req.user.companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Calculate pricing
    const price = plan.getPriceForPeriod(billingPeriod);
    const nextBillingDate = new Date();
    if (billingPeriod === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    // Update company subscription
    await company.update({
      subscriptionPlanId: plan.id,
      subscriptionStatus: 'active',
      settings: {
        ...company.settings,
        billingPeriod,
        subscriptionStartDate: new Date(),
        nextBillingDate,
        subscriptionPrice: price,
        paymentMethodId,
        addOns: []
      }
    });

    // TODO: Create Stripe subscription here
    // const stripeSubscription = await createStripeSubscription(company, plan, billingPeriod, paymentMethodId);

    res.json({
      success: true,
      message: 'Successfully subscribed to plan',
      data: {
        plan: plan.name,
        billingPeriod,
        price,
        nextBillingDate
      }
    });
  } catch (error) {
    console.error('Error subscribing to plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe to plan'
    });
  }
});

// Change subscription plan
router.put('/change-plan', [
  authMiddleware,
  requireOwner,
  body('planId').isUUID().withMessage('Valid plan ID is required'),
  body('billingPeriod').optional().isIn(['monthly', 'yearly']).withMessage('Billing period must be monthly or yearly')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { planId, billingPeriod } = req.body;

    // Get the new plan
    const newPlan = await models.SubscriptionPlan.findByPk(planId);
    if (!newPlan || !newPlan.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found or inactive'
      });
    }

    // Get the company with current plan
    const company = await models.Company.findByPk(req.user.companyId, {
      include: [{
        model: models.SubscriptionPlan,
        required: false
      }]
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    const currentBillingPeriod = billingPeriod || company.settings?.billingPeriod || 'monthly';
    const newPrice = newPlan.getPriceForPeriod(currentBillingPeriod);
    const oldPrice = company.SubscriptionPlan?.getPriceForPeriod(currentBillingPeriod) || 0;

    // Check if this is an upgrade or downgrade
    const isUpgrade = newPrice > oldPrice;
    const changeType = isUpgrade ? 'upgrade' : 'downgrade';

    // Update company subscription
    await company.update({
      subscriptionPlanId: newPlan.id,
      settings: {
        ...company.settings,
        billingPeriod: currentBillingPeriod,
        subscriptionPrice: newPrice,
        planChangeDate: new Date(),
        lastPlanChange: {
          fromPlan: company.SubscriptionPlan?.name || null,
          toPlan: newPlan.name,
          changeType,
          changeDate: new Date(),
          priceChange: newPrice - oldPrice
        }
      }
    });

    // TODO: Update Stripe subscription
    // await updateStripeSubscription(company, newPlan, currentBillingPeriod);

    res.json({
      success: true,
      message: `Successfully ${changeType}d to ${newPlan.name} plan`,
      data: {
        newPlan: newPlan.name,
        changeType,
        newPrice,
        priceChange: newPrice - oldPrice,
        billingPeriod: currentBillingPeriod
      }
    });
  } catch (error) {
    console.error('Error changing subscription plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change subscription plan'
    });
  }
});

// Add add-on to subscription
router.post('/add-ons', [
  authMiddleware,
  requireOwner,
  body('addOnType').isIn(['extraUser', 'extraSKUs', 'extraBranch', 'premiumSupport']).withMessage('Invalid add-on type'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { addOnType, quantity = 1 } = req.body;

    const company = await models.Company.findByPk(req.user.companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Define add-on pricing
    const addOnPricing = {
      extraUser: 3.00,
      extraSKUs: 5.00,
      extraBranch: 29.00,
      premiumSupport: 49.00
    };

    const pricePerUnit = addOnPricing[addOnType];
    const totalPrice = pricePerUnit * quantity;

    // Get current add-ons
    const currentAddOns = company.settings?.addOns || [];
    
    // Check if add-on already exists
    const existingAddOnIndex = currentAddOns.findIndex(addon => addon.type === addOnType);
    
    let updatedAddOns;
    if (existingAddOnIndex >= 0) {
      // Update existing add-on
      updatedAddOns = [...currentAddOns];
      updatedAddOns[existingAddOnIndex] = {
        ...updatedAddOns[existingAddOnIndex],
        quantity: updatedAddOns[existingAddOnIndex].quantity + quantity,
        totalPrice: updatedAddOns[existingAddOnIndex].totalPrice + totalPrice
      };
    } else {
      // Add new add-on
      updatedAddOns = [...currentAddOns, {
        type: addOnType,
        quantity,
        pricePerUnit,
        totalPrice,
        addedDate: new Date()
      }];
    }

    // Update company settings
    await company.update({
      settings: {
        ...company.settings,
        addOns: updatedAddOns
      }
    });

    res.json({
      success: true,
      message: `Successfully added ${addOnType} add-on`,
      data: {
        addOnType,
        quantity,
        pricePerUnit,
        totalPrice,
        allAddOns: updatedAddOns
      }
    });
  } catch (error) {
    console.error('Error adding add-on:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add add-on'
    });
  }
});

// Remove add-on from subscription
router.delete('/add-ons/:addOnType', [authMiddleware, requireOwner], async (req, res) => {
  try {
    const { addOnType } = req.params;
    
    const company = await models.Company.findByPk(req.user.companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    const currentAddOns = company.settings?.addOns || [];
    const updatedAddOns = currentAddOns.filter(addon => addon.type !== addOnType);

    await company.update({
      settings: {
        ...company.settings,
        addOns: updatedAddOns
      }
    });

    res.json({
      success: true,
      message: `Successfully removed ${addOnType} add-on`,
      data: {
        removedAddOn: addOnType,
        remainingAddOns: updatedAddOns
      }
    });
  } catch (error) {
    console.error('Error removing add-on:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove add-on'
    });
  }
});

// Cancel subscription
router.post('/cancel', [authMiddleware, requireOwner], async (req, res) => {
  try {
    const { reason, cancelImmediately = false } = req.body;

    const company = await models.Company.findByPk(req.user.companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    if (company.subscriptionStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Subscription is already cancelled'
      });
    }

    const cancelDate = new Date();
    const effectiveDate = cancelImmediately ? cancelDate : company.settings?.nextBillingDate || cancelDate;

    await company.update({
      subscriptionStatus: cancelImmediately ? 'cancelled' : 'cancelling',
      settings: {
        ...company.settings,
        cancellationDate: cancelDate,
        cancellationEffectiveDate: effectiveDate,
        cancellationReason: reason,
        cancelledBy: req.user.id
      }
    });

    // TODO: Cancel Stripe subscription
    // await cancelStripeSubscription(company, cancelImmediately);

    res.json({
      success: true,
      message: cancelImmediately 
        ? 'Subscription cancelled immediately'
        : `Subscription will be cancelled on ${effectiveDate.toDateString()}`,
      data: {
        cancelDate,
        effectiveDate,
        immediate: cancelImmediately
      }
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

// Get billing history
router.get('/billing-history', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // For now, return mock billing history
    // TODO: Integrate with actual billing system
    const mockHistory = [
      {
        id: '1',
        date: new Date('2024-01-01'),
        description: 'Growth Plan - Monthly',
        amount: 39.00,
        status: 'paid',
        invoiceUrl: '/invoices/invoice-1.pdf'
      },
      {
        id: '2',
        date: new Date('2024-02-01'),
        description: 'Growth Plan - Monthly',
        amount: 39.00,
        status: 'paid',
        invoiceUrl: '/invoices/invoice-2.pdf'
      }
    ];

    res.json({
      success: true,
      data: {
        billingHistory: mockHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: mockHistory.length,
          pages: Math.ceil(mockHistory.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch billing history'
    });
  }
});

module.exports = router;
