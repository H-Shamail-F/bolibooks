const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const POSSale = sequelize.define('POSSale', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      }
    },
    cashierId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    saleNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'card', 'bank_transfer', 'mobile_payment', 'mixed'),
      allowNull: false,
      defaultValue: 'cash'
    },
    paymentDetails: {
      type: DataTypes.JSON,
      defaultValue: {}, // For split payments, card details, etc.
      allowNull: false
    },
    amountTendered: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true // Only for cash payments
    },
    changeGiven: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true // Only for cash payments
    },
    status: {
      type: DataTypes.ENUM('completed', 'refunded', 'partially_refunded', 'cancelled'),
      defaultValue: 'completed',
      allowNull: false
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: true, // Optional for walk-in customers
      references: {
        model: 'customers',
        key: 'id'
      }
    },
    customerInfo: {
      type: DataTypes.JSON,
      defaultValue: {}, // For walk-in customer details
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    receiptPrinted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deviceInfo: {
      type: DataTypes.JSON,
      defaultValue: {}, // Store device/terminal info
      allowNull: false
    },
    shiftId: {
      type: DataTypes.UUID,
      allowNull: true // For future shift management
    }
  }, {
    tableName: 'pos_sales',
    indexes: [
      {
        fields: ['companyId', 'date']
      },
      {
        fields: ['cashierId', 'date']
      },
      {
        fields: ['saleNumber']
      },
      {
        fields: ['status']
      }
    ],
    hooks: {
      beforeCreate: async (sale, options) => {
        // Generate sale number if not provided
        if (!sale.saleNumber) {
          const company = await sequelize.models.Company.findByPk(sale.companyId);
          const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const todaySalesCount = await sequelize.models.POSSale.count({
            where: {
              companyId: sale.companyId,
              createdAt: {
                [sequelize.Sequelize.Op.gte]: new Date().setHours(0, 0, 0, 0)
              }
            }
          });
          
          sale.saleNumber = `POS-${today}-${String(todaySalesCount + 1).padStart(4, '0')}`;
        }

        // Calculate change for cash payments
        if (sale.paymentMethod === 'cash' && sale.amountTendered) {
          sale.changeGiven = Math.max(0, sale.amountTendered - sale.total);
        }
      },
      beforeUpdate: (sale, options) => {
        // Recalculate change if payment details change
        if (sale.paymentMethod === 'cash' && sale.amountTendered) {
          sale.changeGiven = Math.max(0, sale.amountTendered - sale.total);
        }
      }
    }
  });

  return POSSale;
};
