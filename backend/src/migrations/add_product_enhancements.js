'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('products', 'gstApplicable', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });

    await queryInterface.addColumn('products', 'gstRate', {
      type: Sequelize.DECIMAL(5, 2),
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 100
      }
    });

    await queryInterface.addColumn('products', 'packagingType', {
      type: Sequelize.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['jar', 'bottle', 'box', 'pack', 'bag', 'carton', 'container', 'tube', 'sachet', 'pouch', 'piece', 'set']]
      }
    });

    await queryInterface.addColumn('products', 'packagingQuantity', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1
      }
    });

    await queryInterface.addColumn('products', 'pricePerUnit', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    });

    // Add index for barcode field if it doesn't exist
    try {
      await queryInterface.addIndex('products', ['barcode'], {
        name: 'products_barcode_idx',
        unique: false
      });
    } catch (error) {
      // Index might already exist, ignore error
      console.log('Barcode index already exists or error adding:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('products', 'gstApplicable');
    await queryInterface.removeColumn('products', 'gstRate');
    await queryInterface.removeColumn('products', 'packagingType');
    await queryInterface.removeColumn('products', 'packagingQuantity');
    await queryInterface.removeColumn('products', 'pricePerUnit');
    
    try {
      await queryInterface.removeIndex('products', 'products_barcode_idx');
    } catch (error) {
      // Index might not exist, ignore error
      console.log('Barcode index removal error:', error.message);
    }
  }
};
