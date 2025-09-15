const { models, sequelize } = require('../database');

/**
 * Subscription and feature gating middleware
 */

// Check if company has active subscription
const requireActiveSubscription = async (req, res, next) => {
  try {
    // Skip for super admins
    if (req.user.role === 'super_admin') {
      return next();
    }

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

    // Allow if in trial period
    const trialEndDate = company.settings?.trialEndDate;
    if (trialEndDate && new Date() <= new Date(trialEndDate)) {
      req.company = company;
      req.inTrial = true;
      return next();
    }

    // Check subscription status
    if (company.subscriptionStatus !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Active subscription required to access this feature',
        code: 'SUBSCRIPTION_REQUIRED',
        subscriptionStatus: company.subscriptionStatus,
        upgradeUrl: '/settings/subscription'
      });
    }

    req.company = company;
    req.inTrial = false;
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify subscription'
    });
  }
};

/**
 * Middleware to check if a company has access to a specific feature
 */
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      // Skip for super admins
      if (req.user.role === 'super_admin') {
        return next();
      }

      const company = req.company || await models.Company.findByPk(req.user.companyId, {
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

      // Allow if in trial period
      const trialEndDate = company.settings?.trialEndDate;
      if (trialEndDate && new Date() <= new Date(trialEndDate)) {
        req.company = company;
        return next();
      }

      // Check if company has active subscription
      if (company.subscriptionStatus !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'Active subscription required',
          code: 'SUBSCRIPTION_REQUIRED'
        });
      }

      // Check if plan has the required feature
      const features = company.SubscriptionPlan?.features || {};
      if (!features[featureName]) {
        return res.status(403).json({
          success: false,
          error: `This feature requires a higher subscription plan`,
          code: 'FEATURE_NOT_AVAILABLE',
          requiredFeature: featureName,
          currentPlan: company.SubscriptionPlan?.name || 'None',
          upgradeUrl: '/settings/subscription'
        });
      }

      req.company = company;
      next();
    } catch (error) {
      console.error('Error checking feature access:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify feature access'
      });
    }
  };
};

/**
 * Middleware to check if adding a resource would exceed plan limits
 */
const checkResourceLimit = (resourceType, countOverride = null) => {
  return async (req, res, next) => {
    try {
      // Skip for super admins
      if (req.user.role === 'super_admin') {
        return next();
      }

      const company = req.company || await models.Company.findByPk(req.user.companyId, {
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

      // Allow if in trial period (with generous limits)
      const trialEndDate = company.settings?.trialEndDate;
      if (trialEndDate && new Date() <= new Date(trialEndDate)) {
        req.company = company;
        return next();
      }

      // Check if company has active subscription
      if (company.subscriptionStatus !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'Active subscription required',
          code: 'SUBSCRIPTION_REQUIRED'
        });
      }

      if (!company.SubscriptionPlan) {
        return res.status(403).json({
          success: false,
          error: 'No subscription plan found',
          code: 'NO_PLAN'
        });
      }

      // Get current usage and limits
      let currentCount, maxLimit, limitField;

      switch (resourceType) {
        case 'users':
          currentCount = countOverride !== null ? countOverride : 
            await models.User.count({ where: { companyId: company.id, isActive: true } });
          maxLimit = company.SubscriptionPlan.maxUsers;
          limitField = 'maxUsers';
          break;
        
        case 'products':
          currentCount = countOverride !== null ? countOverride :
            await models.Product.count({ where: { companyId: company.id, isActive: true } });
          maxLimit = company.SubscriptionPlan.maxProducts;
          limitField = 'maxProducts';
          break;
        
        case 'branches':
          currentCount = countOverride !== null ? countOverride : 1; // For now, assume 1 branch
          maxLimit = company.SubscriptionPlan.maxBranches;
          limitField = 'maxBranches';
          break;
        
        default:
          req.company = company;
          return next(); // Unknown resource type, allow through
      }

      // Check for add-ons that increase limits
      const addOns = company.settings?.addOns || [];
      let additionalLimit = 0;

      if (resourceType === 'users') {
        const extraUserAddOn = addOns.find(addon => addon.type === 'extraUser');
        additionalLimit = extraUserAddOn ? extraUserAddOn.quantity : 0;
      } else if (resourceType === 'products') {
        const extraSKUsAddOn = addOns.find(addon => addon.type === 'extraSKUs');
        additionalLimit = extraSKUsAddOn ? extraSKUsAddOn.quantity * 1000 : 0;
      } else if (resourceType === 'branches') {
        const extraBranchAddOn = addOns.find(addon => addon.type === 'extraBranch');
        additionalLimit = extraBranchAddOn ? extraBranchAddOn.quantity : 0;
      }

      const effectiveLimit = maxLimit + additionalLimit;

      // Check if we would exceed the limit
      if (currentCount >= effectiveLimit) {
        return res.status(403).json({
          success: false,
          error: `You have reached your ${resourceType} limit of ${effectiveLimit}`,
          code: 'LIMIT_EXCEEDED',
          limit: {
            resourceType,
            current: currentCount,
            max: effectiveLimit,
            baseLimit: maxLimit,
            addOnLimit: additionalLimit
          },
          upgradeUrl: '/settings/subscription'
        });
      }

      // Add usage information to request for reference
      req.usage = {
        resourceType,
        current: currentCount,
        limit: effectiveLimit,
        remaining: effectiveLimit - currentCount
      };
      req.company = company;

      next();
    } catch (error) {
      console.error('Error checking resource limit:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify resource limits'
      });
    }
  };
};

// Legacy function for backward compatibility
const checkFeatureLimit = (featureName, countField) => {
  return requireFeature(featureName);
};

/**
 * Middleware to get company usage statistics
 */
const getUsageStats = async (req, res, next) => {
  try {
    // Skip for super admins
    if (req.user.role === 'super_admin') {
      return next();
    }

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

    // Get current usage
    const [userCount, productCount] = await Promise.all([
      models.User.count({ where: { companyId: company.id, isActive: true } }),
      models.Product.count({ where: { companyId: company.id, isActive: true } })
    ]);

    const branchCount = 1; // For now, assume 1 branch

    // Get add-ons
    const addOns = company.settings?.addOns || [];
    
    // Calculate effective limits
    const extraUsers = addOns.find(addon => addon.type === 'extraUser')?.quantity || 0;
    const extraSKUs = (addOns.find(addon => addon.type === 'extraSKUs')?.quantity || 0) * 1000;
    const extraBranches = addOns.find(addon => addon.type === 'extraBranch')?.quantity || 0;

    const usageStats = {
      users: {
        current: userCount,
        limit: (company.SubscriptionPlan?.maxUsers || 0) + extraUsers,
        baseLimit: company.SubscriptionPlan?.maxUsers || 0,
        addOnLimit: extraUsers
      },
      products: {
        current: productCount,
        limit: (company.SubscriptionPlan?.maxProducts || 0) + extraSKUs,
        baseLimit: company.SubscriptionPlan?.maxProducts || 0,
        addOnLimit: extraSKUs
      },
      branches: {
        current: branchCount,
        limit: (company.SubscriptionPlan?.maxBranches || 0) + extraBranches,
        baseLimit: company.SubscriptionPlan?.maxBranches || 0,
        addOnLimit: extraBranches
      },
      storage: {
        current: 0, // TODO: Calculate actual storage usage
        limit: company.SubscriptionPlan?.maxStorageGB || 0,
        unit: 'GB'
      }
    };

    req.usageStats = usageStats;
    next();
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage statistics'
    });
  }
};

/**
 * Get company subscription info with usage stats
 */
const getSubscriptionInfo = async (companyId) => {
  const company = await models.Company.findByPk(companyId, {
    include: [{
      model: models.SubscriptionPlan,
      required: false
    }]
  });

  if (!company) {
    throw new Error('Company not found');
  }

  const [userCount, productCount] = await Promise.all([
    models.User.count({ where: { companyId: company.id, isActive: true } }),
    models.Product.count({ where: { companyId: company.id, isActive: true } })
  ]);

  const addOns = company.settings?.addOns || [];
  const extraUsers = addOns.find(addon => addon.type === 'extraUser')?.quantity || 0;
  const extraSKUs = (addOns.find(addon => addon.type === 'extraSKUs')?.quantity || 0) * 1000;
  const extraBranches = addOns.find(addon => addon.type === 'extraBranch')?.quantity || 0;

  return {
    company: {
      id: company.id,
      name: company.name,
      subscriptionStatus: company.subscriptionStatus,
      subscriptionPlan: company.SubscriptionPlan?.name || null,
      planTier: company.SubscriptionPlan?.planTier || null,
    },
    plan: company.SubscriptionPlan ? {
      id: company.SubscriptionPlan.id,
      name: company.SubscriptionPlan.name,
      tier: company.SubscriptionPlan.planTier,
      features: company.SubscriptionPlan.features
    } : null,
    usage: {
      users: {
        current: userCount,
        limit: (company.SubscriptionPlan?.maxUsers || 0) + extraUsers,
        percentage: company.SubscriptionPlan ? 
          Math.round((userCount / ((company.SubscriptionPlan.maxUsers || 0) + extraUsers)) * 100) : 0
      },
      products: {
        current: productCount,
        limit: (company.SubscriptionPlan?.maxProducts || 0) + extraSKUs,
        percentage: company.SubscriptionPlan ? 
          Math.round((productCount / ((company.SubscriptionPlan.maxProducts || 0) + extraSKUs)) * 100) : 0
      },
      branches: {
        current: 1,
        limit: (company.SubscriptionPlan?.maxBranches || 0) + extraBranches,
        percentage: company.SubscriptionPlan ? 
          Math.round((1 / ((company.SubscriptionPlan.maxBranches || 0) + extraBranches)) * 100) : 0
      }
    },
    addOns: addOns,
    inTrial: company.settings?.trialEndDate && new Date() <= new Date(company.settings.trialEndDate),
    trialEndDate: company.settings?.trialEndDate || null
  };
};

// Specific feature middlewares (updated to use new structure)
const requirePOSFeature = requireFeature('pos');
const requireUnlimitedInvoices = requireFeature('unlimited_invoices');
const requireMultipleUsers = requireFeature('multiple_users');
const requireAdvancedReporting = requireFeature('advanced_reporting');
const requireAPIAccess = requireFeature('api_access');
const requireCustomTemplates = requireFeature('custom_templates');
const requireBulkOperations = requireFeature('bulk_operations');
const requireMultiCurrency = requireFeature('multi_currency');
const requireInventoryManagement = requireFeature('inventory_management');
const requireCustomerPortal = requireFeature('customer_portal');
const requireWhiteLabeling = requireFeature('white_labeling');
const requirePrioritySupport = requireFeature('priority_support');
const requireAdvancedIntegrations = requireFeature('advanced_integrations');

// Resource limit middlewares
const checkUserLimit = checkResourceLimit('users');
const checkProductLimit = checkResourceLimit('products');
const checkBranchLimit = checkResourceLimit('branches');

// Usage tracking middleware
const trackUsage = (featureType) => {
  return async (req, res, next) => {
    // Add usage tracking after successful operation
    const originalSend = res.json;
    res.json = function(data) {
      // Track usage asynchronously
      if (data.success && req.user && req.user.companyId) {
        setImmediate(async () => {
          try {
            // Could implement usage analytics here
            console.log(`Feature used: ${featureType} by company ${req.user.companyId}`);
          } catch (error) {
            console.error('Usage tracking error:', error);
          }
        });
      }
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  // Core middleware
  requireActiveSubscription,
  requireFeature,
  checkResourceLimit,
  getUsageStats,
  getSubscriptionInfo,
  
  // Legacy compatibility
  checkFeatureLimit,
  
  // Feature-specific middleware
  requirePOSFeature,
  requireUnlimitedInvoices,
  requireMultipleUsers,
  requireAdvancedReporting,
  requireAPIAccess,
  requireCustomTemplates,
  requireBulkOperations,
  requireMultiCurrency,
  requireInventoryManagement,
  requireCustomerPortal,
  requireWhiteLabeling,
  requirePrioritySupport,
  requireAdvancedIntegrations,
  
  // Resource limit middleware
  checkUserLimit,
  checkProductLimit,
  checkBranchLimit,
  
  // Utility
  trackUsage
};
