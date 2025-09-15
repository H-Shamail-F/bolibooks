const crypto = require('crypto');
const axios = require('axios');

// BML Merchant Portal Service (scaffold)
// NOTE: Replace placeholder signing and endpoints with the official BML spec.

class BMLService {
  constructor(config) {
    this.enabled = config.enabled === 'true' || config.enabled === true;
    this.merchantId = config.merchantId;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.webhookSecret = config.webhookSecret;
    this.baseUrl = config.baseUrl?.replace(/\/$/, '') || '';
    this.returnUrl = config.returnUrl;
    this.cancelUrl = config.cancelUrl;
    this.currency = config.currency || 'MVR';
  }

  isConfigured() {
    return this.enabled && this.merchantId && this.apiKey && this.apiSecret && this.baseUrl;
  }

  // Example signature generator using HMAC-SHA256
  signPayload(payload) {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', this.apiSecret);
    hmac.update(body);
    const signature = hmac.digest('hex');
    return signature;
  }

  // Initiate a hosted payment (placeholder). Returns redirect URL and a local reference.
  async initiatePayment({ amount, currency, orderId, description, customer }) {
    if (!this.isConfigured()) {
      throw new Error('BML not configured');
    }

    const payload = {
      merchantId: this.merchantId,
      amount: Math.round(Number(amount) * 100), // cents-like if required
      currency: currency || this.currency,
      orderId,
      description,
      returnUrl: this.returnUrl,
      cancelUrl: this.cancelUrl,
      customer: customer || {},
      timestamp: new Date().toISOString(),
    };

    // Placeholder remote call; adjust to BML API when available
    // const signature = this.signPayload(payload);
    // const res = await axios.post(`${this.baseUrl}/payments`, payload, {
    //   headers: { 'X-API-KEY': this.apiKey, 'X-SIGNATURE': signature, 'Content-Type': 'application/json' }
    // });
    // return res.data;

    // For now, return a mock structure to let our app flow
    const mock = {
      success: true,
      provider: 'bml',
      redirectUrl: `${this.returnUrl}?mock=1&orderId=${encodeURIComponent(orderId)}`,
      reference: `bml_${Date.now()}`,
      raw: payload,
    };
    return mock;
  }

  // Verify webhook (placeholder). Return { valid: boolean, data }
  verifyWebhook(signature, rawBody) {
    if (!this.webhookSecret) return { valid: false, reason: 'No webhook secret' };
    try {
      const expected = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
      const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || '', 'utf8'));
      return { valid };
    } catch (e) {
      return { valid: false, reason: e.message };
    }
  }

  // Check payment status (placeholder). Returns status string
  async getPaymentStatus(reference) {
    if (!this.isConfigured()) throw new Error('BML not configured');
    // Example: const res = await axios.get(`${this.baseUrl}/payments/${reference}`, {...})
    // Return a mock success for now.
    return { reference, status: 'succeeded' };
  }
}

module.exports = function createBMLServiceFromEnv(env) {
  return new BMLService({
    enabled: env.BML_ENABLED,
    merchantId: env.BML_MERCHANT_ID,
    apiKey: env.BML_API_KEY,
    apiSecret: env.BML_API_SECRET,
    webhookSecret: env.BML_WEBHOOK_SECRET,
    baseUrl: env.BML_BASE_URL,
    returnUrl: env.BML_RETURN_URL,
    cancelUrl: env.BML_CANCEL_URL,
    currency: env.BML_CURRENCY,
  });
};

