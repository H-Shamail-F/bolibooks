const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: true, // Made optional for non-invoice payments
      references: {
        model: 'invoices',
        key: 'id'
      }
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
      validate: {
        isIn: [['USD', 'EUR', 'GBP', 'MVR']]
      }
    },
    method: {
      type: DataTypes.ENUM('stripe', 'paypal', 'bml', 'cash', 'bank_transfer', 'card', 'check', 'online', 'other'),
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
      defaultValue: 'pending'
    },
    // Stripe-specific fields
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // PayPal-specific fields
    paypalOrderId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    paypalCaptureId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    // Timestamps
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Reference to related entities
    saleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'PosSales',
        key: 'id'
      }
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'customers',
        key: 'id'
      }
    },
    // Metadata for additional information
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    // Fee information
    processingFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    },
    // Audit fields
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'payments',
    timestamps: true,
    paranoid: true, // Soft delete
    indexes: [
      {
        fields: ['invoiceId']
      },
      {
        fields: ['companyId', 'date']
      },
      {
        fields: ['status']
      },
      {
        fields: ['method']
      },
      {
        fields: ['stripePaymentIntentId'],
        unique: true,
        where: {
          stripePaymentIntentId: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      },
      {
        fields: ['paypalOrderId'],
        unique: true,
        where: {
          paypalOrderId: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['paidAt']
      }
    ]
  });

  // Class methods
  Payment.getPaymentMethods = function() {
    return ['stripe', 'paypal', 'bml', 'cash', 'bank_transfer', 'card', 'check', 'online', 'other'];
  };

  Payment.getPaymentStatuses = function() {
    return ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'];
  };

  Payment.getCurrencies = function() {
    return ['USD', 'EUR', 'GBP', 'MVR'];
  };

  // Instance methods
  Payment.prototype.isCompleted = function() {
    return this.status === 'completed';
  };

  Payment.prototype.isPending = function() {
    return this.status === 'pending';
  };

  Payment.prototype.isFailed = function() {
    return this.status === 'failed';
  };

  Payment.prototype.canRefund = function() {
    return this.status === 'completed' && !this.refundedAt;
  };

  Payment.prototype.getDisplayAmount = function() {
    return `${this.currency} ${parseFloat(this.amount).toFixed(2)}`;
  };

  // Hooks
  Payment.beforeCreate(async (payment) => {
    // Set default timestamps
    if (payment.status === 'completed' && !payment.paidAt) {
      payment.paidAt = new Date();
    }
  });

  Payment.beforeUpdate(async (payment) => {
    // Update timestamps based on status changes
    if (payment.changed('status')) {
      if (payment.status === 'completed' && !payment.paidAt) {
        payment.paidAt = new Date();
      }
      
      if (payment.status === 'refunded' && !payment.refundedAt) {
        payment.refundedAt = new Date();
      }
    }
  });

  // Associations
  Payment.associate = function(models) {
    // Payment belongs to a company
    Payment.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'Company'
    });

    // Payment belongs to a user (creator)
    Payment.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'CreatedBy'
    });

    // Payment may be associated with an invoice
    Payment.belongsTo(models.Invoice, {
      foreignKey: 'invoiceId',
      as: 'Invoice'
    });

    // Payment may be associated with a POS sale
    Payment.belongsTo(models.PosSale, {
      foreignKey: 'saleId',
      as: 'Sale'
    });

    // Payment may be associated with a customer
    Payment.belongsTo(models.Customer, {
      foreignKey: 'customerId',
      as: 'Customer'
    });
  };

  return Payment;
};
