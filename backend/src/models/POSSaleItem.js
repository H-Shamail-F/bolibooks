const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const POSSaleItem = sequelize.define('POSSaleItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    saleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'pos_sales',
        key: 'id'
      }
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: false // Store name at time of sale
    },
    productSku: {
      type: DataTypes.STRING,
      allowNull: true // Store SKU at time of sale
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1.00,
      validate: {
        min: 0.01
      }
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false // Store original price before any item-level discounts
    },
    discountType: {
      type: DataTypes.ENUM('percentage', 'fixed', 'none'),
      defaultValue: 'none'
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    lineTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true // Special instructions, modifications, etc.
    },
    isRefunded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    refundedQuantity: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'pos_sale_items',
    indexes: [
      {
        fields: ['saleId']
      },
      {
        fields: ['productId']
      },
      {
        fields: ['isRefunded']
      }
    ],
    hooks: {
      beforeSave: (item) => {
        // Calculate discount amount
        if (item.discountType === 'percentage') {
          item.discountAmount = (item.originalPrice * item.quantity * item.discountValue) / 100;
        } else if (item.discountType === 'fixed') {
          item.discountAmount = item.discountValue;
        } else {
          item.discountAmount = 0;
        }

        // Calculate unit price after discount
        const discountPerUnit = item.discountAmount / item.quantity;
        item.unitPrice = item.originalPrice - discountPerUnit;

        // Calculate tax amount (applied after discount)
        const subtotalAfterDiscount = (item.unitPrice * item.quantity);
        item.taxAmount = (subtotalAfterDiscount * item.taxRate) / 100;

        // Calculate line total
        item.lineTotal = subtotalAfterDiscount + item.taxAmount;
      },
      afterCreate: async (item, options) => {
        // Update product stock quantity
        const product = await sequelize.models.Product.findByPk(item.productId);
        if (product && product.trackInventory) {
          const newQuantity = product.stockQuantity - item.quantity;
          if (newQuantity < 0) {
            console.warn(`Warning: Stock for product ${product.name} went negative: ${newQuantity}`);
          }
          await product.update({ stockQuantity: Math.max(0, newQuantity) });
        }
      },
      afterUpdate: async (item, options) => {
        // Handle refunds - restore inventory
        if (item.changed('isRefunded') && item.isRefunded && !item.refundedAt) {
          item.refundedAt = new Date();
          const refundQuantity = item.refundedQuantity || item.quantity;
          
          const product = await sequelize.models.Product.findByPk(item.productId);
          if (product && product.trackInventory) {
            await product.increment('stockQuantity', { by: refundQuantity });
          }
        }
      }
    }
  });

  return POSSaleItem;
};
