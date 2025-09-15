const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    invoiceNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      }
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'customers',
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
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'templates',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('invoice', 'quote'),
      defaultValue: 'invoice',
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled', 'quote'),
      defaultValue: 'draft',
      allowNull: false
    },
    issueDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    gstEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    gstRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    gstAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    discountType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      defaultValue: 'percentage'
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    balanceAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    termsAndConditions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    attachments: {
      type: DataTypes.JSON,
      defaultValue: []
    }
  }, {
    tableName: 'invoices',
    indexes: [
      {
        fields: ['companyId', 'status']
      },
      {
        fields: ['customerId']
      },
      {
        fields: ['dueDate']
      },
      {
        unique: true,
        fields: ['invoiceNumber']
      }
    ],
    hooks: {
      beforeUpdate: (invoice) => {
        // Calculate balance amount
        invoice.balanceAmount = invoice.total - invoice.paidAmount;
        
        // Update status based on payment
        if (invoice.paidAmount >= invoice.total) {
          invoice.status = 'paid';
          if (!invoice.paidAt) {
            invoice.paidAt = new Date();
          }
        } else if (invoice.paidAmount > 0) {
          invoice.status = 'partially_paid';
        } else if (new Date() > invoice.dueDate && invoice.status !== 'paid') {
          invoice.status = 'overdue';
        }
      }
    }
  });

  return Invoice;
};
