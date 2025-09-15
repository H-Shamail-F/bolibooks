const Stripe = require('stripe');

class StripeService {
  constructor() {
    this.stripe = null;
    this.initialized = false;
  }

  initialize() {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('⚠️  Stripe secret key not configured. Payment processing will be unavailable.');
      return false;
    }

    try {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      this.initialized = true;
      console.log('✅ Stripe service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Stripe:', error.message);
      return false;
    }
  }

  isInitialized() {
    return this.initialized;
  }

  // Create a payment intent for one-time payments
  async createPaymentIntent({ amount, currency = 'usd', description, metadata = {} }) {
    if (!this.initialized) {
      throw new Error('Stripe service not initialized');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        description,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        }
      };
    } catch (error) {
      console.error('Stripe payment intent creation error:', error);
      return {
        success: false,
        error: error.message,
        type: error.type || 'stripe_error'
      };
    }
  }

  // Confirm a payment intent
  async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    if (!this.initialized) {
      throw new Error('Stripe service not initialized');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      return {
        success: true,
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency
        }
      };
    } catch (error) {
      console.error('Stripe payment confirmation error:', error);
      return {
        success: false,
        error: error.message,
        type: error.type || 'stripe_error'
      };
    }
  }

  // Create a customer for subscription billing
  async createCustomer({ email, name, description, metadata = {} }) {
    if (!this.initialized) {
      throw new Error('Stripe service not initialized');
    }

    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        description,
        metadata
      });

      return {
        success: true,
        data: {
          customerId: customer.id,
          email: customer.email,
          name: customer.name,
          created: customer.created
        }
      };
    } catch (error) {
      console.error('Stripe customer creation error:', error);
      return {
        success: false,
        error: error.message,
        type: error.type || 'stripe_error'
      };
    }
  }

  // Create a subscription
  async createSubscription({ customerId, priceId, metadata = {} }) {
    if (!this.initialized) {
      throw new Error('Stripe service not initialized');
    }

    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      return {
        success: true,
        data: {
          subscriptionId: subscription.id,
          status: subscription.status,
          clientSecret: subscription.latest_invoice.payment_intent.client_secret,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end
        }
      };
    } catch (error) {
      console.error('Stripe subscription creation error:', error);
      return {
        success: false,
        error: error.message,
        type: error.type || 'stripe_error'
      };
    }
  }

  // Cancel a subscription
  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    if (!this.initialized) {
      throw new Error('Stripe service not initialized');
    }

    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });

      return {
        success: true,
        data: {
          subscriptionId: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: subscription.current_period_end
        }
      };
    } catch (error) {
      console.error('Stripe subscription cancellation error:', error);
      return {
        success: false,
        error: error.message,
        type: error.type || 'stripe_error'
      };
    }
  }

  // Create a product and price for subscription plans
  async createProduct({ name, description, metadata = {} }) {
    if (!this.initialized) {
      throw new Error('Stripe service not initialized');
    }

    try {
      const product = await this.stripe.products.create({
        name,
        description,
        metadata,
        type: 'service'
      });

      return {
        success: true,
        data: {
          productId: product.id,
          name: product.name,
          description: product.description
        }
      };
    } catch (error) {
      console.error('Stripe product creation error:', error);
      return {
        success: false,
        error: error.message,
        type: error.type || 'stripe_error'
      };
    }
  }

  async createPrice({ productId, amount, currency = 'usd', interval = 'month' }) {
    if (!this.initialized) {
      throw new Error('Stripe service not initialized');
    }

    try {
      const price = await this.stripe.prices.create({
        product: productId,
        unit_amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        recurring: {
          interval: interval
        }
      });

      return {
        success: true,
        data: {
          priceId: price.id,
          productId: price.product,
          amount: price.unit_amount / 100,
          currency: price.currency,
          interval: price.recurring.interval
        }
      };
    } catch (error) {
      console.error('Stripe price creation error:', error);
      return {
        success: false,
        error: error.message,
        type: error.type || 'stripe_error'
      };
    }
  }

  // Handle webhook verification
  async verifyWebhook(payload, signature) {
    if (!this.initialized) {
      throw new Error('Stripe service not initialized');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return {
        success: true,
        event
      };
    } catch (error) {
      console.error('Stripe webhook verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Retrieve payment intent details
  async getPaymentIntent(paymentIntentId) {
    if (!this.initialized) {
      throw new Error('Stripe service not initialized');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        success: true,
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          description: paymentIntent.description,
          metadata: paymentIntent.metadata
        }
      };
    } catch (error) {
      console.error('Stripe payment intent retrieval error:', error);
      return {
        success: false,
        error: error.message,
        type: error.type || 'stripe_error'
      };
    }
  }

  // Get subscription details
  async getSubscription(subscriptionId) {
    if (!this.initialized) {
      throw new Error('Stripe service not initialized');
    }

    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      return {
        success: true,
        data: {
          id: subscription.id,
          status: subscription.status,
          customerId: subscription.customer,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          metadata: subscription.metadata
        }
      };
    } catch (error) {
      console.error('Stripe subscription retrieval error:', error);
      return {
        success: false,
        error: error.message,
        type: error.type || 'stripe_error'
      };
    }
  }
}

// Create singleton instance
const stripeService = new StripeService();

// Initialize on module load if environment variables are available
if (process.env.STRIPE_SECRET_KEY) {
  stripeService.initialize();
}

module.exports = stripeService;
