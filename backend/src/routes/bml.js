const express = require('express');
const router = express.Router();
const createBMLServiceFromEnv = require('../services/bmlService');
const { models } = require('../database');
const bodyParser = require('body-parser');

// Simple auth middleware for testing
const auth = (req, res, next) => {
  req.user = { id: 1, companyId: 1 }; // Simple auth for testing
  next();
};

// Parse raw body for webhook signature verification BEFORE any auth middleware
router.use('/webhook', bodyParser.raw({ type: '*/*' }));

function getService() {
  return createBMLServiceFromEnv(process.env);
}

// GET /api/payments/bml/config
router.get('/config', auth, (req, res) => {
  const svc = getService();
  res.json({
    enabled: !!svc.enabled,
    configured: svc.isConfigured(),
    merchantId: svc.merchantId ? 'configured' : null,
    currency: svc.currency,
    returnUrl: svc.returnUrl,
    cancelUrl: svc.cancelUrl,
  });
});

// POST /api/payments/bml/create
router.post('/create', auth, async (req, res, next) => {
  try {
    const { amount, currency, orderId, description, customer } = req.body;
    const svc = getService();
    const init = await svc.initiatePayment({ amount, currency, orderId, description, customer });

    // TODO: Persist a Payment record (temporarily disabled for testing)
    // if (Payment) {
    //   await Payment.create({
    //     method: 'bml',
    //     status: 'pending',
    //     amount,
    //     currency: currency || svc.currency,
    //     reference: init.reference,
    //     description: description || 'BML Payment',
    //     metadata: init.raw || {},
    //     companyId: req.user?.companyId,
    //     createdBy: req.user?.id,
    //   });
    // }

    res.json({ success: true, provider: 'bml', ...init });
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/bml/status/:reference
router.get('/status/:reference', auth, async (req, res, next) => {
  try {
    const svc = getService();
    const { reference } = req.params;
    const status = await svc.getPaymentStatus(reference);
    res.json({ success: true, provider: 'bml', ...status });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/bml/webhook
router.post('/webhook', async (req, res) => {
  try {
    const svc = getService();
    const signature = req.headers['x-bml-signature'] || req.headers['x-signature'];
    
    // Get raw body - it might be a buffer or string depending on body parser
    let rawBody;
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body;
    } else if (typeof req.body === 'string') {
      rawBody = req.body;
    } else {
      // If it's already parsed as JSON, stringify it back
      rawBody = JSON.stringify(req.body);
    }
    
    const verification = svc.verifyWebhook(signature, rawBody);

    if (!verification.valid) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // Parse body after verifying signature
    try {
      JSON.parse(rawBody.toString('utf8'));
    } catch {
      // Event parsing failed - webhook still valid
    }

    // TODO: Map BML event to update Payment status (paid, failed, canceled)
    // Example: await Payment.update({ status: 'succeeded' }, { where: { providerReference: event.reference } });

    res.json({ received: true });
  } catch (err) {
    console.error('BML webhook error:', err.message);
    res.status(500).json({ success: false });
  }
});

module.exports = router;

