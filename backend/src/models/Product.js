const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true
    },
    barcode: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    unit: {
      type: DataTypes.STRING(20),
      defaultValue: 'pcs',
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    stockQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    lowStockThreshold: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      validate: {
        min: 0
      }
    },
    trackInventory: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    images: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    gstApplicable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    gstRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    packagingType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['jar', 'bottle', 'box', 'pack', 'bag', 'carton', 'container', 'tube', 'sachet', 'pouch', 'piece', 'set']]
      }
    },
    packagingQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    pricePerUnit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    }
  }, {
    tableName: 'products',
    indexes: [
      {
        fields: ['companyId', 'name']
      },
      {
        fields: ['sku']
      },
      {
        fields: ['category']
      }
    ],
    hooks: {
      afterUpdate: async (product, options) => {
        // Check for low stock and create alert if needed
        if (product.trackInventory && product.stockQuantity <= product.lowStockThreshold) {
          // TODO: Implement low stock notification system
          console.log(`Low stock alert for ${product.name}: ${product.stockQuantity} remaining`);
        }
      }
    }
  });

  return Product;
};
