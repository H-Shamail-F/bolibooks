const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Expense = sequelize.define('Expense', {
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
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    expenseNumber: {
      type: DataTypes.STRING(50),
      allowNull: true // Auto-generated if not provided
    },
    category: {
      type: DataTypes.ENUM(
        'Rent',
        'Utilities',
        'Salaries',
        'Supplies',
        'Marketing',
        'Travel',
        'Insurance',
        'Professional Services',
        'Equipment',
        'Software',
        'Maintenance',
        'Office Expenses',
        'Telecommunications',
        'Other'
      ),
      allowNull: false
    },
    subcategory: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    vendor: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'bank_transfer', 'card', 'check', 'online', 'other'),
      defaultValue: 'cash'
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true // Invoice number, check number, etc.
    },
    receiptUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    receiptFilename: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    recurringPeriod: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'),
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'approved'
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'expenses',
    indexes: [
      {
        fields: ['companyId', 'category']
      },
      {
        fields: ['companyId', 'date']
      },
      {
        fields: ['vendor']
      },
      {
        fields: ['status']
      }
    ],
    hooks: {
      beforeCreate: async (expense) => {
        if (!expense.expenseNumber) {
          // Generate expense number
          const lastExpense = await sequelize.models.Expense.findOne({
            where: { companyId: expense.companyId },
            order: [['createdAt', 'DESC']]
          });
          
          const nextNumber = lastExpense 
            ? parseInt(lastExpense.expenseNumber.split('-')[1]) + 1
            : 1;
          
          expense.expenseNumber = `EXP-${String(nextNumber).padStart(4, '0')}`;
        }
      }
    }
  });

  return Expense;
};
