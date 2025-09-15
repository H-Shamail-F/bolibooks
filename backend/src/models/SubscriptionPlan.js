const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 50]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    monthlyPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    yearlyPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    discountPercentage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    planTier: {
      type: DataTypes.ENUM('starter', 'growth', 'business', 'enterprise'),
      allowNull: false
    },
    trialPeriodDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 365
      }
    },
    maxUsers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: -1 // -1 means unlimited
      }
    },
    maxProducts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 200,
      validate: {
        min: -1 // -1 means unlimited
      }
    },
    maxBranches: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    maxStorageGB: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: -1 // -1 means unlimited
      }
    },
    features: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        pos: true,
        barcodeScanning: true,
        receipts: true,
        invoicing: 'basic', // basic, custom, advanced
        quotes: 'basic', // basic, custom, advanced
        payments: ['stripe'], // stripe, paypal, bml
        inventory: 'basic', // basic, advanced, multi-location
        reporting: 'basic', // basic, advanced, premium
        analytics: false,
        profitLoss: false,
        multiLocation: false,
        subscriptionManagement: false,
        roleBasedAccess: false,
        apiAccess: false,
        integrations: [],
        customBranding: false,
        whiteLabel: false,
        prioritySupport: false,
        advancedFinancialReports: false,
        companyIsolation: true
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    stripeProductId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Stripe product ID for payment processing'
    },
    stripePriceId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Stripe price ID for payment processing'
    },
    paypalPlanId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'PayPal plan ID for payment processing'
    }
  }, {
    tableName: 'subscription_plans',
    timestamps: true,
    indexes: [
      {
        fields: ['name'],
        unique: true
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['sortOrder']
      },
      {
        fields: ['monthlyPrice']
      },
      {
        fields: ['planTier']
      }
    ]
  });

  // Instance methods
  SubscriptionPlan.prototype.hasFeature = function(featureName) {
    return this.features && this.features[featureName] === true;
  };

  SubscriptionPlan.prototype.getFeatureValue = function(featureName) {
    return this.features ? this.features[featureName] : false;
  };

  SubscriptionPlan.prototype.canAddUsers = function(currentUserCount) {
    if (this.maxUsers === -1) return true; // unlimited
    return currentUserCount < this.maxUsers;
  };

  SubscriptionPlan.prototype.canAddProducts = function(currentProductCount) {
    if (this.maxProducts === -1) return true; // unlimited
    return currentProductCount < this.maxProducts;
  };

  SubscriptionPlan.prototype.getMonthlyPrice = function() {
    return parseFloat(this.monthlyPrice);
  };

  SubscriptionPlan.prototype.getYearlyPrice = function() {
    return parseFloat(this.yearlyPrice);
  };

  SubscriptionPlan.prototype.getYearlySavings = function() {
    const monthlyTotal = this.getMonthlyPrice() * 12;
    const yearlyPrice = this.getYearlyPrice();
    return monthlyTotal - yearlyPrice;
  };

  SubscriptionPlan.prototype.getEffectiveMonthlyPrice = function(isYearly = false) {
    return isYearly ? this.getYearlyPrice() / 12 : this.getMonthlyPrice();
  };

  SubscriptionPlan.prototype.getPriceForPeriod = function(billingPeriod) {
    return billingPeriod === 'yearly' ? this.getYearlyPrice() : this.getMonthlyPrice();
  };

  // Static methods
  SubscriptionPlan.getActivePlans = function() {
    return this.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['monthlyPrice', 'ASC']]
    });
  };

  SubscriptionPlan.getFreeTrialPlan = function() {
    return this.findOne({
      where: { 
        monthlyPrice: 0, 
        isActive: true,
        name: { [sequelize.Sequelize.Op.iLike]: '%trial%' }
      }
    });
  };

  return SubscriptionPlan;
};
