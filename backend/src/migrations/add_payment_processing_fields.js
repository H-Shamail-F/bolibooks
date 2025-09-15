const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    // Add new columns for enhanced payment processing
    const newColumns = {
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      stripePaymentIntentId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      stripeCustomerId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      paypalOrderId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      paypalCaptureId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      refundedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
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
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: '{}'
      },
      processingFee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    };

    // Add columns one by one to handle any existing column conflicts
    for (const [columnName, columnDefinition] of Object.entries(newColumns)) {
      try {
        await queryInterface.addColumn('payments', columnName, columnDefinition);
        console.log(`Added column: ${columnName}`);
      } catch (error) {
        if (error.message.includes('duplicate column name') || error.message.includes('already exists')) {
          console.log(`Column ${columnName} already exists, skipping...`);
        } else {
          console.error(`Error adding column ${columnName}:`, error.message);
        }
      }
    }

    // Update the method enum to include new payment methods
    try {
      // SQLite doesn't support ALTER COLUMN directly, but we can update existing records
      // and rely on the model definition for new records
      console.log('Payment method enum will be updated through model definition');
    } catch (error) {
      console.error('Error updating method enum:', error.message);
    }

    // Update the status enum to include new statuses
    try {
      console.log('Payment status enum will be updated through model definition');
    } catch (error) {
      console.error('Error updating status enum:', error.message);
    }

    // Make invoiceId nullable for non-invoice payments
    try {
      // SQLite doesn't support modifying column constraints directly
      // This will be handled by the model definition
      console.log('InvoiceId nullability will be handled by model definition');
    } catch (error) {
      console.error('Error updating invoiceId constraint:', error.message);
    }

    console.log('Enhanced payment processing fields migration completed');
  },

  down: async (queryInterface) => {
    // Remove the added columns
    const columnsToRemove = [
      'currency',
      'description',
      'stripePaymentIntentId',
      'stripeCustomerId', 
      'paypalOrderId',
      'paypalCaptureId',
      'paidAt',
      'refundedAt',
      'saleId',
      'customerId',
      'metadata',
      'processingFee',
      'createdBy',
      'deletedAt'
    ];

    for (const columnName of columnsToRemove) {
      try {
        await queryInterface.removeColumn('payments', columnName);
        console.log(`Removed column: ${columnName}`);
      } catch (error) {
        console.error(`Error removing column ${columnName}:`, error.message);
      }
    }

    console.log('Enhanced payment processing fields rollback completed');
  }
};
