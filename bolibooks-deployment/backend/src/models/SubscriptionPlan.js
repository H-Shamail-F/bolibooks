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
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    billingPeriod: {
      type: DataTypes.ENUM('monthly', 'yearly', 'lifetime'),
      allowNull: false,
      defaultValue: 'monthly'
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
      defaultValue: 100,
      validate: {
        min: -1 // -1 means unlimited
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
        inventory: true,
        invoicing: false,
        reporting: 'basic', // basic, advanced, premium
        barcode: false,
        multiLocation: false,
        advancedReports: false,
        apiAccess: false,
        customBranding: false,
        webhooks: false,
        integrations: false,
        bulkOperations: false,
        advancedInventory: false,
        customerPortal: false,
        recurringBilling: false
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
        fields: ['price']
      },
      {
        fields: ['billingPeriod']
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
    if (this.billingPeriod === 'monthly') {
      return parseFloat(this.price);
    } else if (this.billingPeriod === 'yearly') {
      return parseFloat(this.price) / 12;
    }
    return 0; // lifetime plans don't have monthly pricing
  };

  SubscriptionPlan.prototype.getYearlyPrice = function() {
    if (this.billingPeriod === 'yearly') {
      return parseFloat(this.price);
    } else if (this.billingPeriod === 'monthly') {
      return parseFloat(this.price) * 12;
    }
    return 0; // lifetime plans don't have yearly pricing
  };

  // Static methods
  SubscriptionPlan.getActivePlans = function() {
    return this.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['price', 'ASC']]
    });
  };

  SubscriptionPlan.getFreeTrialPlan = function() {
    return this.findOne({
      where: { 
        price: 0, 
        isActive: true,
        name: { [sequelize.Sequelize.Op.iLike]: '%trial%' }
      }
    });
  };

  return SubscriptionPlan;
};
