const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Company = sequelize.define('Company', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    taxId: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      allowNull: false,
      validate: {
        isIn: [['USD', 'MVR', 'EUR', 'GBP', 'INR']]
      }
    },
    gstEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    gstRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 8.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    fiscalYearStart: {
      type: DataTypes.STRING(5), // Format: MM-DD
      defaultValue: '01-01'
    },
    subscriptionStatus: {
      type: DataTypes.ENUM('trial', 'active', 'suspended', 'cancelled'),
      defaultValue: 'trial',
      allowNull: false
    },
    subscriptionPlan: {
      type: DataTypes.ENUM('basic', 'professional', 'enterprise'),
      defaultValue: 'basic'
    },
    subscriptionEndDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    maxUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    maxInvoicesPerMonth: {
      type: DataTypes.INTEGER,
      defaultValue: 100
    },
    settings: {
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: false
    }
  }, {
    tableName: 'companies',
    indexes: [
      {
        unique: true,
        fields: ['email']
      }
    ]
  });

  return Company;
};
