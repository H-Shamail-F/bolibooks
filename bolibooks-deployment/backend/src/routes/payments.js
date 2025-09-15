const express = require('express');
const { body, validationResult } = require('express-validator');
const { models } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all payments for a company
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, invoiceId, method, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = { companyId: req.user.companyId };
    
    if (invoiceId) whereClause.invoiceId = invoiceId;
    if (method) whereClause.method = method;
    if (startDate && endDate) {
      whereClause.date = {
        [models.sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const payments = await models.Payment.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: models.Invoice, 
          attributes: ['id', 'invoiceNumber', 'total'],
          include: [
            { model: models.Customer, attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      payments: payments.rows,
      totalCount: payments.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(payments.count / limit)
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get single payment
router.get('/:id', async (req, res) => {
  try {
    const payment = await models.Payment.findOne({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: [
        { 
          model: models.Invoice,
          include: [
            { model: models.Customer }
          ]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Create new payment
router.post('/', [
  body('invoiceId').notEmpty().withMessage('Invoice ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('method').isIn(['cash', 'bank_transfer', 'card', 'check', 'online', 'other']).withMessage('Invalid payment method'),
  body('date').optional().isISO8601().withMessage('Valid date is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { invoiceId, amount, method, date, reference, notes } = req.body;

    // Verify invoice exists and belongs to the company
    const invoice = await models.Invoice.findOne({
      where: { id: invoiceId, companyId: req.user.companyId }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if payment amount is valid
    const remainingBalance = invoice.total - invoice.paidAmount;
    if (amount > remainingBalance) {
      return res.status(400).json({ 
        error: 'Payment amount exceeds remaining balance',
        remainingBalance: remainingBalance
      });
    }

    // Create payment
    const payment = await models.Payment.create({
      invoiceId,
      companyId: req.user.companyId,
      amount: parseFloat(amount),
      method,
      date: date ? new Date(date) : new Date(),
      reference,
      notes,
      status: 'completed'
    });

    // Update invoice paid amount and status
    const newPaidAmount = invoice.paidAmount + parseFloat(amount);
    const updateData = { paidAmount: newPaidAmount };

    if (newPaidAmount >= invoice.total) {
      updateData.status = 'paid';
      updateData.paidAt = new Date();
    } else {
      updateData.status = 'partially_paid';
    }

    await invoice.update(updateData);

    // Fetch complete payment with associations
    const completePayment = await models.Payment.findByPk(payment.id, {
      include: [
        { 
          model: models.Invoice,
          include: [{ model: models.Customer }]
        }
      ]
    });

    res.status(201).json(completePayment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Update payment
router.put('/:id', [
  body('amount').optional().isNumeric().withMessage('Amount must be a number'),
  body('method').optional().isIn(['cash', 'bank_transfer', 'card', 'check', 'online', 'other']).withMessage('Invalid payment method'),
  body('date').optional().isISO8601().withMessage('Valid date is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payment = await models.Payment.findOne({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: [{ model: models.Invoice }]
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const oldAmount = payment.amount;
    const newAmount = req.body.amount ? parseFloat(req.body.amount) : oldAmount;

    // If amount is being changed, update invoice totals
    if (newAmount !== oldAmount) {
      const invoice = payment.Invoice;
      const amountDifference = newAmount - oldAmount;
      const newPaidAmount = invoice.paidAmount + amountDifference;

      // Check if new amount is valid
      if (newPaidAmount > invoice.total) {
        return res.status(400).json({ 
          error: 'Updated payment amount would exceed invoice total',
          maxAmount: invoice.total - (invoice.paidAmount - oldAmount)
        });
      }

      if (newPaidAmount < 0) {
        return res.status(400).json({ error: 'Payment amount cannot be negative' });
      }

      // Update invoice
      const invoiceUpdateData = { paidAmount: newPaidAmount };
      if (newPaidAmount >= invoice.total) {
        invoiceUpdateData.status = 'paid';
        invoiceUpdateData.paidAt = new Date();
      } else if (newPaidAmount > 0) {
        invoiceUpdateData.status = 'partially_paid';
        invoiceUpdateData.paidAt = null;
      } else {
        invoiceUpdateData.status = invoice.status === 'paid' ? 'sent' : invoice.status;
        invoiceUpdateData.paidAt = null;
      }

      await invoice.update(invoiceUpdateData);
    }

    await payment.update(req.body);

    const updatedPayment = await models.Payment.findByPk(payment.id, {
      include: [
        { 
          model: models.Invoice,
          include: [{ model: models.Customer }]
        }
      ]
    });

    res.json(updatedPayment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const payment = await models.Payment.findOne({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: [{ model: models.Invoice }]
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const invoice = payment.Invoice;
    const paymentAmount = payment.amount;

    // Update invoice totals
    const newPaidAmount = invoice.paidAmount - paymentAmount;
    const invoiceUpdateData = { paidAmount: newPaidAmount };

    if (newPaidAmount <= 0) {
      invoiceUpdateData.paidAmount = 0;
      invoiceUpdateData.status = invoice.status === 'paid' ? 'sent' : invoice.status;
      invoiceUpdateData.paidAt = null;
    } else if (newPaidAmount < invoice.total) {
      invoiceUpdateData.status = 'partially_paid';
      invoiceUpdateData.paidAt = null;
    }

    await invoice.update(invoiceUpdateData);
    await payment.destroy();

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// Get payment methods statistics
router.get('/stats/methods', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = { companyId: req.user.companyId };
    if (startDate && endDate) {
      whereClause.date = {
        [models.sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const methodStats = await models.Payment.findAll({
      where: whereClause,
      attributes: [
        'method',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count'],
        [models.sequelize.fn('SUM', models.sequelize.col('amount')), 'totalAmount']
      ],
      group: ['method'],
      raw: true
    });

    res.json(methodStats);
  } catch (error) {
    console.error('Error fetching payment method stats:', error);
    res.status(500).json({ error: 'Failed to fetch payment statistics' });
  }
});

// Get payments for a specific invoice
router.get('/invoice/:invoiceId', async (req, res) => {
  try {
    // Verify invoice belongs to the company
    const invoice = await models.Invoice.findOne({
      where: { id: req.params.invoiceId, companyId: req.user.companyId }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const payments = await models.Payment.findAll({
      where: { invoiceId: req.params.invoiceId },
      order: [['date', 'DESC']]
    });

    res.json({
      payments,
      summary: {
        totalPaid: payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0),
        paymentCount: payments.length,
        invoiceTotal: parseFloat(invoice.total),
        remainingBalance: parseFloat(invoice.total) - parseFloat(invoice.paidAmount)
      }
    });
  } catch (error) {
    console.error('Error fetching invoice payments:', error);
    res.status(500).json({ error: 'Failed to fetch invoice payments' });
  }
});

module.exports = router;
