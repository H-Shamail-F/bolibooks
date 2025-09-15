const express = require('express');
const { body, validationResult } = require('express-validator');
const { models } = require('../database');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const StripeService = require('../services/StripeService');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get payment configuration and available methods
router.get('/config', async (req, res) => {
  try {
    const config = {
      stripe: {
        available: StripeService.isInitialized(),
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null
      },
      paypal: {
        available: !!process.env.PAYPAL_CLIENT_ID,
        clientId: process.env.PAYPAL_CLIENT_ID || null,
        environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox'
      },
      supportedMethods: ['cash', 'card', 'bank_transfer'],
      currencies: ['USD', 'EUR', 'GBP']
    };

    if (StripeService.isInitialized()) {
      config.supportedMethods.push('stripe');
    }

    if (process.env.PAYPAL_CLIENT_ID) {
      config.supportedMethods.push('paypal');
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching payment config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment configuration'
    });
  }
});

// Create payment intent for Stripe
router.post('/create-payment-intent', [
  body('amount').isNumeric().withMessage('Amount is required and must be numeric'),
  body('currency').optional().isIn(['usd', 'eur', 'gbp']).withMessage('Invalid currency'),
  body('description').optional().isString().withMessage('Description must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    if (!StripeService.isInitialized()) {
      return res.status(503).json({
        success: false,
        message: 'Stripe payment processing is not available'
      });
    }

    const { amount, currency = 'usd', description, metadata = {} } = req.body;

    // Add company and user info to metadata
    const paymentMetadata = {
      ...metadata,
      companyId: req.user.companyId,
      userId: req.user.id,
      userEmail: req.user.email
    };

    const result = await StripeService.createPaymentIntent({
      amount: parseFloat(amount),
      currency,
      description: description || 'BoliBooks Payment',
      metadata: paymentMetadata
    });

    if (result.success) {
      // Create payment record in database
      const payment = await models.Payment.create({
        companyId: req.user.companyId,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        method: 'stripe',
        status: 'pending',
        description: description || 'BoliBooks Payment',
        stripePaymentIntentId: result.data.paymentIntentId,
        metadata: paymentMetadata,
        createdBy: req.user.id
      });

      res.json({
        success: true,
        data: {
          ...result.data,
          paymentId: payment.id
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error,
        type: result.type
      });
    }
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent'
    });
  }
});

// Confirm Stripe payment
router.post('/confirm-payment/:paymentId', [
  body('paymentMethodId').notEmpty().withMessage('Payment method ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { paymentId } = req.params;
    const { paymentMethodId } = req.body;

    // Find payment record
    const payment = await models.Payment.findOne({
      where: { id: paymentId, companyId: req.user.companyId }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (!payment.stripePaymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment is not a Stripe payment'
      });
    }

    const result = await StripeService.confirmPaymentIntent(
      payment.stripePaymentIntentId,
      paymentMethodId
    );

    if (result.success) {
      await payment.update({
        status: result.data.status === 'succeeded' ? 'completed' : result.data.status,
        paidAt: result.data.status === 'succeeded' ? new Date() : null
      });

      res.json({
        success: true,
        data: {
          ...result.data,
          paymentId: payment.id
        }
      });
    } else {
      await payment.update({ status: 'failed' });
      
      res.status(400).json({
        success: false,
        message: result.error,
        type: result.type
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment'
    });
  }
});

// Create subscription for company
router.post('/create-subscription', [requireAdmin], [
  body('planId').notEmpty().withMessage('Subscription plan ID is required'),
  body('paymentMethodId').optional().isString().withMessage('Payment method ID must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    if (!StripeService.isInitialized()) {
      return res.status(503).json({
        success: false,
        message: 'Stripe billing is not available'
      });
    }

    const { planId, paymentMethodId } = req.body;

    // Get subscription plan
    const plan = await models.SubscriptionPlan.findByPk(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    // Get or create company
    const company = await models.Company.findByPk(req.user.companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Create or get Stripe customer
    let stripeCustomerId = company.stripeCustomerId;
    
    if (!stripeCustomerId) {
      const customerResult = await StripeService.createCustomer({
        email: company.email || req.user.email,
        name: company.name,
        description: `BoliBooks customer for ${company.name}`,
        metadata: {
          companyId: company.id,
          userId: req.user.id
        }
      });

      if (!customerResult.success) {
        return res.status(400).json({
          success: false,
          message: customerResult.error
        });
      }

      stripeCustomerId = customerResult.data.customerId;
      await company.update({ stripeCustomerId });
    }

    // Create subscription
    const subscriptionResult = await StripeService.createSubscription({
      customerId: stripeCustomerId,
      priceId: plan.stripePriceId,
      metadata: {
        companyId: company.id,
        planId: plan.id,
        userId: req.user.id
      }
    });

    if (subscriptionResult.success) {
      // Update company subscription
      await company.update({
        subscriptionPlanId: plan.id,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        stripeSubscriptionId: subscriptionResult.data.subscriptionId
      });

      res.json({
        success: true,
        data: subscriptionResult.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: subscriptionResult.error
      });
    }
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription'
    });
  }
});

// Cancel subscription
router.post('/cancel-subscription', [requireAdmin], async (req, res) => {
  try {
    const company = await models.Company.findByPk(req.user.companyId);
    if (!company || !company.stripeSubscriptionId) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    const result = await StripeService.cancelSubscription(company.stripeSubscriptionId, true);

    if (result.success) {
      await company.update({
        subscriptionStatus: 'cancelled'
      });

      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
});

// Webhook handler for Stripe events
router.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const webhookResult = await StripeService.verifyWebhook(req.body, signature);

    if (!webhookResult.success) {
      return res.status(400).json({
        success: false,
        message: webhookResult.error
      });
    }

    const event = webhookResult.event;

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleSubscriptionPaymentSuccess(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
      
      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

// Get payment history
router.get('/history', async (req, res) => {
  try {
    console.log('Payment history requested for company:', req.user.companyId);
    
    // Simple query first - just return empty payments array for now
    const payments = {
      rows: [],
      count: 0
    };

    res.json({
      success: true,
      data: {
        payments: payments.rows,
        totalCount: payments.count,
        currentPage: 1,
        totalPages: 0
      }
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

// Webhook helper functions
async function handlePaymentSuccess(paymentIntent) {
  try {
    const payment = await models.Payment.findOne({
      where: { stripePaymentIntentId: paymentIntent.id }
    });

    if (payment) {
      await payment.update({
        status: 'completed',
        paidAt: new Date()
      });
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailed(paymentIntent) {
  try {
    const payment = await models.Payment.findOne({
      where: { stripePaymentIntentId: paymentIntent.id }
    });

    if (payment) {
      await payment.update({
        status: 'failed'
      });
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleSubscriptionPaymentSuccess(invoice) {
  try {
    // Update company subscription status
    const subscription = await StripeService.getSubscription(invoice.subscription);
    
    if (subscription.success) {
      const company = await models.Company.findOne({
        where: { stripeSubscriptionId: invoice.subscription }
      });

      if (company) {
        await company.update({
          subscriptionStatus: 'active',
          subscriptionEndDate: new Date(subscription.data.currentPeriodEnd * 1000)
        });
      }
    }
  } catch (error) {
    console.error('Error handling subscription payment success:', error);
  }
}

async function handleSubscriptionCancelled(subscription) {
  try {
    const company = await models.Company.findOne({
      where: { stripeSubscriptionId: subscription.id }
    });

    if (company) {
      await company.update({
        subscriptionStatus: 'cancelled'
      });
    }
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

module.exports = router;
