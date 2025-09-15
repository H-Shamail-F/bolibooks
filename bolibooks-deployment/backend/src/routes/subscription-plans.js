const express = require('express');
const { models } = require('../database');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all subscription plans
router.get('/', async (req, res) => {
  try {
    const plans = await models.SubscriptionPlan.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['price', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        plans
      }
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans'
    });
  }
});

// Get single subscription plan
router.get('/:id', async (req, res) => {
  try {
    const plan = await models.SubscriptionPlan.findByPk(req.params.id);
    
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plan'
    });
  }
});

// Create new subscription plan (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      billingPeriod,
      trialPeriodDays,
      maxUsers,
      maxProducts,
      maxStorageGB,
      features,
      sortOrder
    } = req.body;

    const plan = await models.SubscriptionPlan.create({
      name,
      description,
      price,
      billingPeriod,
      trialPeriodDays: trialPeriodDays || 0,
      maxUsers,
      maxProducts,
      maxStorageGB: maxStorageGB || 1,
      features: features || {},
      sortOrder: sortOrder || 0,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: plan,
      message: 'Subscription plan created successfully'
    });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription plan'
    });
  }
});

// Update subscription plan (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const plan = await models.SubscriptionPlan.findByPk(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    await plan.update(req.body);

    res.json({
      success: true,
      data: plan,
      message: 'Subscription plan updated successfully'
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription plan'
    });
  }
});

// Delete subscription plan (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const plan = await models.SubscriptionPlan.findByPk(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    // Soft delete by setting isActive to false
    await plan.update({ isActive: false });

    res.json({
      success: true,
      message: 'Subscription plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subscription plan'
    });
  }
});

module.exports = router;
