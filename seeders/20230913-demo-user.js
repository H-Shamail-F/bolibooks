'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid'); // Import uuid generator

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const passwordHash = await bcrypt.hash('demo123', 10);
    await queryInterface.bulkInsert('users', [{
      id: uuidv4(), // Generate a valid UUID
      companyId: 'demo-company-id', // Replace with a valid company UUID
      email: 'demo@example.com',
      password: passwordHash,
      firstName: 'Demo',
      lastName: 'User',
      role: 'super_admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', { email: 'demo@example.com' }, {});
  }
};