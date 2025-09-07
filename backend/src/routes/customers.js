const express = require('express');
const { body, validationResult } = require('express-validator');
const { models } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all customers for a company
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive = 'true' } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = { companyId: req.user.companyId };
    
    if (isActive !== 'all') {
      whereClause.isActive = isActive === 'true';
    }
    
    if (search) {
      whereClause[models.sequelize.Op.or] = [
        { name: { [models.sequelize.Op.iLike]: `%${search}%` } },
        { email: { [models.sequelize.Op.iLike]: `%${search}%` } },
        { phone: { [models.sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    const customers = await models.Customer.findAndCountAll({
      where: whereClause,
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: models.Invoice,
          attributes: ['id', 'total', 'status'],
          separate: true,
          limit: 5,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    // Calculate customer statistics
    const customersWithStats = await Promise.all(
      customers.rows.map(async (customer) => {
        const stats = await models.Invoice.findOne({
          where: { customerId: customer.id },
          attributes: [
            [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'totalInvoices'],
            [models.sequelize.fn('SUM', models.sequelize.col('total')), 'totalAmount'],
            [models.sequelize.fn('SUM', models.sequelize.col('paidAmount')), 'totalPaid']
          ],
          raw: true
        });

        return {
          ...customer.toJSON(),
          stats: {
            totalInvoices: parseInt(stats?.totalInvoices || 0),
            totalAmount: parseFloat(stats?.totalAmount || 0),
            totalPaid: parseFloat(stats?.totalPaid || 0),
            outstandingAmount: parseFloat(stats?.totalAmount || 0) - parseFloat(stats?.totalPaid || 0)
          }
        };
      })
    );

    res.json({
      customers: customersWithStats,
      totalCount: customers.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(customers.count / limit)
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get single customer with detailed info
router.get('/:id', async (req, res) => {
  try {
    const customer = await models.Customer.findOne({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: [
        {
          model: models.Invoice,
          include: [{ model: models.Payment }],
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create new customer
router.post('/', [
  body('name').notEmpty().withMessage('Customer name is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().notEmpty().withMessage('Phone number cannot be empty'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customerData = {
      ...req.body,
      companyId: req.user.companyId
    };

    // Check for duplicate email within the company
    if (customerData.email) {
      const existingCustomer = await models.Customer.findOne({
        where: { 
          email: customerData.email, 
          companyId: req.user.companyId 
        }
      });

      if (existingCustomer) {
        return res.status(400).json({ error: 'Customer with this email already exists' });
      }
    }

    const customer = await models.Customer.create(customerData);
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('Customer name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customer = await models.Customer.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check for duplicate email if email is being updated
    if (req.body.email && req.body.email !== customer.email) {
      const existingCustomer = await models.Customer.findOne({
        where: { 
          email: req.body.email, 
          companyId: req.user.companyId,
          id: { [models.sequelize.Op.ne]: req.params.id }
        }
      });

      if (existingCustomer) {
        return res.status(400).json({ error: 'Customer with this email already exists' });
      }
    }

    await customer.update(req.body);
    
    const updatedCustomer = await models.Customer.findByPk(customer.id);
    res.json(updatedCustomer);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer (soft delete by setting isActive to false)
router.delete('/:id', async (req, res) => {
  try {
    const customer = await models.Customer.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if customer has any invoices
    const invoiceCount = await models.Invoice.count({
      where: { customerId: req.params.id }
    });

    if (invoiceCount > 0) {
      // Soft delete - set isActive to false
      await customer.update({ isActive: false });
      res.json({ message: 'Customer deactivated successfully (has existing invoices)' });
    } else {
      // Hard delete if no invoices exist
      await customer.destroy();
      res.json({ message: 'Customer deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Reactivate customer
router.patch('/:id/reactivate', async (req, res) => {
  try {
    const customer = await models.Customer.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await customer.update({ isActive: true });
    res.json({ message: 'Customer reactivated successfully', customer });
  } catch (error) {
    console.error('Error reactivating customer:', error);
    res.status(500).json({ error: 'Failed to reactivate customer' });
  }
});

// Get customer transaction history
router.get('/:id/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const customer = await models.Customer.findOne({
      where: { id: req.params.id, companyId: req.user.companyId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const transactions = await models.Invoice.findAndCountAll({
      where: { customerId: req.params.id },
      include: [
        { model: models.Payment, separate: true, order: [['date', 'DESC']] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      transactions: transactions.rows,
      totalCount: transactions.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(transactions.count / limit)
    });
  } catch (error) {
    console.error('Error fetching customer transactions:', error);
    res.status(500).json({ error: 'Failed to fetch customer transactions' });
  }
});

module.exports = router;
