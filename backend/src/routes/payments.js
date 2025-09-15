const express = require('express');
const { body, validationResult } = require('express-validator');
const { models } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Mock PayPal service (replace with actual implementation when needed)
const paypalService = {
  createOrder: async () => ({
    id: 'MOCK_ORDER_' + Date.now(),
    links: [{ rel: 'approve', href: 'https://example.com/approve' }]
  }),
  captureOrder: async () => ({
    id: 'MOCK_CAPTURE_' + Date.now(),
    status: 'COMPLETED',
    purchase_units: [{
      payments: {
        captures: [{
          amount: { value: '100.00' }
        }]
      }
    }]
  }),
  createSubscription: async () => ({
    id: 'MOCK_SUB_' + Date.now(),
    links: [{ rel: 'approve', href: 'https://example.com/approve-sub' }]
  }),
  cancelSubscription: async () => ({ status: 'CANCELLED' })
};

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

// PayPal Routes

// Create PayPal order
router.post('/paypal/create-order', async (req, res) => {
  try {
    const { amount, currency = 'USD', invoiceId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const order = await paypalService.createOrder({
      amount: parseFloat(amount),
      currency,
      description: invoiceId ? `Invoice #${invoiceId}` : 'Payment',
      invoiceId
    });
    
    res.json({
      success: true,
      orderID: order.id,
      approvalUrl: order.links.find(link => link.rel === 'approve')?.href
    });
  } catch (error) {
    console.error('PayPal order creation failed:', error);
    res.status(500).json({ 
      error: 'Failed to create PayPal order',
      details: error.message 
    });
  }
});

// Capture PayPal order
router.post('/paypal/capture-order', async (req, res) => {
  try {
    const { orderID, invoiceId } = req.body;
    
    if (!orderID) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    const captureResult = await paypalService.captureOrder(orderID);
    
    if (captureResult.status === 'COMPLETED') {
      // Record payment in database if invoice ID provided
      if (invoiceId) {
        const invoice = await models.Invoice.findOne({
          where: { id: invoiceId, companyId: req.user.companyId }
        });
        
        if (invoice) {
          const amount = parseFloat(captureResult.purchase_units[0].payments.captures[0].amount.value);
          
          await models.Payment.create({
            invoiceId,
            companyId: req.user.companyId,
            amount,
            method: 'paypal',
            reference: orderID,
            status: 'completed',
            paymentGatewayId: captureResult.id,
            gatewayResponse: captureResult
          });
          
          // Update invoice
          const newPaidAmount = invoice.paidAmount + amount;
          await invoice.update({
            paidAmount: newPaidAmount,
            status: newPaidAmount >= invoice.total ? 'paid' : 'partially_paid'
          });
        }
      }
      
      res.json({
        success: true,
        captureID: captureResult.id,
        status: captureResult.status
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Payment capture failed',
        status: captureResult.status 
      });
    }
  } catch (error) {
    console.error('PayPal capture failed:', error);
    res.status(500).json({ 
      error: 'Failed to capture PayPal payment',
      details: error.message 
    });
  }
});

// Create PayPal subscription
router.post('/paypal/create-subscription', async (req, res) => {
  try {
    const { planId, customerId } = req.body;
    
    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }
    
    const subscription = await paypalService.createSubscription({
      planId,
      customerId: customerId || req.user.id,
      companyId: req.user.companyId
    });
    
    res.json({
      success: true,
      subscriptionID: subscription.id,
      approvalUrl: subscription.links.find(link => link.rel === 'approve')?.href
    });
  } catch (error) {
    console.error('PayPal subscription creation failed:', error);
    res.status(500).json({ 
      error: 'Failed to create PayPal subscription',
      details: error.message 
    });
  }
});

// Cancel PayPal subscription
router.post('/paypal/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId, reason = 'User requested cancellation' } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }
    
    await paypalService.cancelSubscription(subscriptionId, reason);
    
    // Update company subscription status
    await models.Company.update(
      { subscriptionStatus: 'cancelled' },
      { where: { id: req.user.companyId } }
    );
    
    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('PayPal subscription cancellation failed:', error);
    res.status(500).json({ 
      error: 'Failed to cancel PayPal subscription',
      details: error.message 
    });
  }
});

// PayPal webhook handler
router.post('/paypal/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const isValid = await paypalService.verifyWebhook(
      req.headers,
      req.body
    );
    
    if (!isValid) {
      console.error('Invalid PayPal webhook signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    
    const event = JSON.parse(req.body.toString());
    console.log('PayPal webhook event:', event.event_type);
    
    // Handle different event types
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        // Handle successful payment
        const capture = event.resource;
        console.log('Payment captured:', capture.id);
        break;
      }
        
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        // Handle subscription activation
        const subscription = event.resource;
        console.log('Subscription activated:', subscription.id);
        break;
      }
        
      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        // Handle subscription cancellation
        const cancelledSub = event.resource;
        console.log('Subscription cancelled:', cancelledSub.id);
        break;
      }
        
      default:
        console.log('Unhandled PayPal webhook event:', event.event_type);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
