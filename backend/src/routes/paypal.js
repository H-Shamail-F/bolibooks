const express = require('express');
const { body, validationResult } = require('express-validator');
const { models } = require('../database');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const PayPalService = require('../services/PayPalService');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Check if PayPal is available
router.get('/status', async (req, res) => {
  try {
    const isInitialized = PayPalService.isInitialized();
    
    res.json({
      success: true,
      data: {
        available: isInitialized,
        environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
        clientId: isInitialized ? process.env.PAYPAL_CLIENT_ID : null
      }
    });
  } catch (error) {
    console.error('Error checking PayPal status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check PayPal availability'
    });
  }
});

// Create PayPal order
router.post('/create-order', [
  body('amount').isNumeric().withMessage('Amount is required and must be numeric'),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP']).withMessage('Invalid currency'),
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

    if (!PayPalService.isInitialized()) {
      return res.status(503).json({
        success: false,
        message: 'PayPal service is not available'
      });
    }

    const { amount, currency = 'USD', description, returnUrl, cancelUrl } = req.body;

    // Add company and user info to metadata
    const metadata = {
      companyId: req.user.companyId,
      userId: req.user.id,
      userEmail: req.user.email
    };

    const result = await PayPalService.createOrder({
      amount: parseFloat(amount),
      currency,
      description: description || 'BoliBooks Payment',
      returnUrl,
      cancelUrl,
      metadata
    });

    if (result.success) {
      // Create payment record in database
      const payment = await models.Payment.create({
        companyId: req.user.companyId,
        amount: parseFloat(amount),
        currency,
        method: 'paypal',
        status: 'pending',
        description: description || 'BoliBooks Payment',
        paypalOrderId: result.data.orderId,
        metadata,
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
    console.error('Error creating PayPal order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create PayPal order'
    });
  }
});

// Capture PayPal payment after user approval
router.post('/capture-payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

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

    if (!payment.paypalOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Payment is not a PayPal payment'
      });
    }

    const result = await PayPalService.captureOrder(payment.paypalOrderId);

    if (result.success) {
      const isCompleted = result.data.status === 'COMPLETED';
      
      await payment.update({
        status: isCompleted ? 'completed' : result.data.status.toLowerCase(),
        paidAt: isCompleted ? new Date() : null,
        paypalCaptureId: result.data.captureId
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
    console.error('Error capturing PayPal payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to capture PayPal payment'
    });
  }
});

// Get PayPal order details
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find payment record
    const payment = await models.Payment.findOne({
      where: { paypalOrderId: orderId, companyId: req.user.companyId }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const result = await PayPalService.getOrder(orderId);

    if (result.success) {
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
    console.error('Error fetching PayPal order details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PayPal order details'
    });
  }
});

// Create subscription for company
router.post('/create-subscription', [requireAdmin], [
  body('planId').notEmpty().withMessage('Subscription plan ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    if (!PayPalService.isInitialized()) {
      return res.status(503).json({
        success: false,
        message: 'PayPal billing is not available'
      });
    }

    const { planId, returnUrl, cancelUrl } = req.body;

    // Get subscription plan
    const plan = await models.SubscriptionPlan.findByPk(planId);
    if (!plan || !plan.isActive || !plan.paypalPlanId) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found or not available for PayPal'
      });
    }

    // Get company
    const company = await models.Company.findByPk(req.user.companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Get user
    const user = await models.User.findByPk(req.user.id);

    // Create subscription
    const subscriptionResult = await PayPalService.createSubscription({
      planId: plan.paypalPlanId,
      subscriber: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      returnUrl,
      cancelUrl,
      metadata: {
        companyId: company.id,
        planId: plan.id,
        userId: req.user.id
      }
    });

    if (subscriptionResult.success) {
      // Update company subscription - we'll fully activate after webhook confirmation
      await company.update({
        subscriptionPlanId: plan.id,
        subscriptionStatus: 'pending',
        paypalSubscriptionId: subscriptionResult.data.subscriptionId
      });

      res.json({
        success: true,
        data: subscriptionResult.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: subscriptionResult.error,
        type: subscriptionResult.type
      });
    }
  } catch (error) {
    console.error('Error creating PayPal subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create PayPal subscription'
    });
  }
});

// Cancel subscription
router.post('/cancel-subscription', [requireAdmin], async (req, res) => {
  try {
    const company = await models.Company.findByPk(req.user.companyId);
    if (!company || !company.paypalSubscriptionId) {
      return res.status(404).json({
        success: false,
        message: 'No active PayPal subscription found'
      });
    }

    const { reason } = req.body;
    const result = await PayPalService.cancelSubscription(
      company.paypalSubscriptionId,
      reason || 'Cancelled by user'
    );

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
        message: result.error,
        type: result.type
      });
    }
  } catch (error) {
    console.error('Error cancelling PayPal subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel PayPal subscription'
    });
  }
});

// Webhook handler for PayPal events
router.post('/webhooks', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    const webhookResult = await PayPalService.verifyWebhook(req.headers, req.body);

    if (!webhookResult.success) {
      return res.status(400).json({
        success: false,
        message: webhookResult.error
      });
    }

    const event = webhookResult.event;
    console.log('Received PayPal webhook event:', event.event_type);

    // Handle different event types
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptured(event.resource);
        break;
      
      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED':
        await handlePaymentFailed(event.resource);
        break;
      
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(event.resource);
        break;
      
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(event.resource);
        break;
      
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await handleSubscriptionExpired(event.resource);
        break;
      
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        await handleSubscriptionPaymentFailed(event.resource);
        break;
      
      default:
        console.log(`Unhandled PayPal webhook event type: ${event.event_type}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    res.status(400).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

// Webhook helper functions
async function handlePaymentCaptured(resource) {
  try {
    const payment = await models.Payment.findOne({
      where: { paypalCaptureId: resource.id }
    });

    if (payment) {
      await payment.update({
        status: 'completed',
        paidAt: new Date()
      });
    } else {
      // Try finding by order ID
      const orderPayment = await models.Payment.findOne({
        where: { paypalOrderId: resource.supplementary_data?.related_ids?.order_id }
      });
      
      if (orderPayment) {
        await orderPayment.update({
          paypalCaptureId: resource.id,
          status: 'completed',
          paidAt: new Date()
        });
      }
    }
  } catch (error) {
    console.error('Error handling PayPal payment capture:', error);
  }
}

async function handlePaymentFailed(resource) {
  try {
    const payment = await models.Payment.findOne({
      where: { 
        [models.sequelize.Op.or]: [
          { paypalCaptureId: resource.id },
          { paypalOrderId: resource.supplementary_data?.related_ids?.order_id }
        ]
      }
    });

    if (payment) {
      await payment.update({
        status: 'failed'
      });
    }
  } catch (error) {
    console.error('Error handling PayPal payment failure:', error);
  }
}

async function handleSubscriptionActivated(subscription) {
  try {
    // Find company by PayPal subscription ID
    const company = await models.Company.findOne({
      where: { paypalSubscriptionId: subscription.id }
    });

    if (company) {
      // Parse subscription details
      const endDate = subscription.billing_info?.next_billing_time 
        ? new Date(subscription.billing_info.next_billing_time) 
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

      await company.update({
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: endDate
      });
    }
  } catch (error) {
    console.error('Error handling PayPal subscription activation:', error);
  }
}

async function handleSubscriptionCancelled(subscription) {
  try {
    const company = await models.Company.findOne({
      where: { paypalSubscriptionId: subscription.id }
    });

    if (company) {
      await company.update({
        subscriptionStatus: 'cancelled'
      });
    }
  } catch (error) {
    console.error('Error handling PayPal subscription cancellation:', error);
  }
}

async function handleSubscriptionExpired(subscription) {
  try {
    const company = await models.Company.findOne({
      where: { paypalSubscriptionId: subscription.id }
    });

    if (company) {
      await company.update({
        subscriptionStatus: 'expired'
      });
    }
  } catch (error) {
    console.error('Error handling PayPal subscription expiration:', error);
  }
}

async function handleSubscriptionPaymentFailed(subscription) {
  try {
    const company = await models.Company.findOne({
      where: { paypalSubscriptionId: subscription.id }
    });

    if (company) {
      // We could update to a warning status or increment a failed payment counter
      // For now, just log the event
      console.warn(`Subscription payment failed for company ${company.id}, subscription ${subscription.id}`);
    }
  } catch (error) {
    console.error('Error handling PayPal subscription payment failure:', error);
  }
}

module.exports = router;
