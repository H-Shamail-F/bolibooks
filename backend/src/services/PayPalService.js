const { paypalHttp } = require('@paypal/paypal-server-sdk');

class PayPalService {
  constructor() {
    this.client = null;
    this.environment = null;
    this.initialized = false;
    this.init();
  }

  init() {
    try {
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
        console.warn('PayPal credentials not found in environment variables');
        return;
      }

      // Determine environment
      const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
      
      if (environment === 'live') {
        this.environment = new paypalHttp.core.LiveEnvironment(
          process.env.PAYPAL_CLIENT_ID,
          process.env.PAYPAL_CLIENT_SECRET
        );
      } else {
        this.environment = new paypalHttp.core.SandboxEnvironment(
          process.env.PAYPAL_CLIENT_ID,
          process.env.PAYPAL_CLIENT_SECRET
        );
      }

      this.client = new paypalHttp.core.PayPalHttpClient(this.environment);
      this.initialized = true;

      console.log(`PayPal service initialized in ${environment} mode`);
    } catch (error) {
      console.error('Failed to initialize PayPal service:', error.message);
      this.initialized = false;
    }
  }

  isInitialized() {
    return this.initialized;
  }

  async createOrder(orderData) {
    try {
      if (!this.isInitialized()) {
        return {
          success: false,
          error: 'PayPal service not initialized',
          type: 'service_error'
        };
      }

      const request = new paypalHttp.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      
      const orderPayload = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: orderData.currency?.toUpperCase() || 'USD',
            value: orderData.amount.toFixed(2)
          },
          description: orderData.description || 'BoliBooks Payment'
        }],
        application_context: {
          brand_name: 'BoliBooks',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: orderData.returnUrl || `${process.env.FRONTEND_URL}/payment/success`,
          cancel_url: orderData.cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`
        }
      };

      if (orderData.metadata) {
        orderPayload.purchase_units[0].custom_id = JSON.stringify(orderData.metadata);
      }

      request.requestBody(orderPayload);

      const response = await this.client.execute(request);
      
      return {
        success: true,
        data: {
          orderId: response.result.id,
          status: response.result.status,
          approvalUrl: response.result.links.find(link => link.rel === 'approve')?.href,
          captureUrl: response.result.links.find(link => link.rel === 'capture')?.href,
          order: response.result
        }
      };
    } catch (error) {
      console.error('PayPal create order error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create PayPal order',
        type: 'paypal_error'
      };
    }
  }

  async captureOrder(orderId) {
    try {
      if (!this.isInitialized()) {
        return {
          success: false,
          error: 'PayPal service not initialized',
          type: 'service_error'
        };
      }

      const request = new paypalHttp.orders.OrdersCaptureRequest(orderId);
      request.prefer('return=representation');

      const response = await this.client.execute(request);
      
      return {
        success: true,
        data: {
          orderId: response.result.id,
          status: response.result.status,
          captureId: response.result.purchase_units[0]?.payments?.captures?.[0]?.id,
          amount: response.result.purchase_units[0]?.payments?.captures?.[0]?.amount,
          order: response.result
        }
      };
    } catch (error) {
      console.error('PayPal capture order error:', error);
      return {
        success: false,
        error: error.message || 'Failed to capture PayPal order',
        type: 'paypal_error'
      };
    }
  }

  async getOrder(orderId) {
    try {
      if (!this.isInitialized()) {
        return {
          success: false,
          error: 'PayPal service not initialized',
          type: 'service_error'
        };
      }

      const request = new paypalHttp.orders.OrdersGetRequest(orderId);
      const response = await this.client.execute(request);
      
      return {
        success: true,
        data: {
          order: response.result
        }
      };
    } catch (error) {
      console.error('PayPal get order error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get PayPal order',
        type: 'paypal_error'
      };
    }
  }

  async createProduct(productData) {
    try {
      if (!this.isInitialized()) {
        return {
          success: false,
          error: 'PayPal service not initialized',
          type: 'service_error'
        };
      }

      const request = new paypalHttp.subscriptions.ProductsCreateRequest();
      
      const productPayload = {
        name: productData.name,
        description: productData.description,
        type: 'SERVICE',
        category: 'SOFTWARE',
        home_url: process.env.FRONTEND_URL || 'https://bolibooks.com'
      };

      request.requestBody(productPayload);

      const response = await this.client.execute(request);
      
      return {
        success: true,
        data: {
          productId: response.result.id,
          product: response.result
        }
      };
    } catch (error) {
      console.error('PayPal create product error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create PayPal product',
        type: 'paypal_error'
      };
    }
  }

  async createBillingPlan(planData) {
    try {
      if (!this.isInitialized()) {
        return {
          success: false,
          error: 'PayPal service not initialized',
          type: 'service_error'
        };
      }

      const request = new paypalHttp.subscriptions.PlansCreateRequest();
      
      const planPayload = {
        product_id: planData.productId,
        name: planData.name,
        description: planData.description,
        billing_cycles: [{
          frequency: {
            interval_unit: planData.intervalUnit || 'MONTH',
            interval_count: planData.intervalCount || 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // Infinite
          pricing_scheme: {
            fixed_price: {
              value: planData.amount.toFixed(2),
              currency_code: planData.currency?.toUpperCase() || 'USD'
            }
          }
        }],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3
        }
      };

      request.requestBody(planPayload);

      const response = await this.client.execute(request);
      
      return {
        success: true,
        data: {
          planId: response.result.id,
          plan: response.result
        }
      };
    } catch (error) {
      console.error('PayPal create plan error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create PayPal billing plan',
        type: 'paypal_error'
      };
    }
  }

  async createSubscription(subscriptionData) {
    try {
      if (!this.isInitialized()) {
        return {
          success: false,
          error: 'PayPal service not initialized',
          type: 'service_error'
        };
      }

      const request = new paypalHttp.subscriptions.SubscriptionsCreateRequest();
      
      const subscriptionPayload = {
        plan_id: subscriptionData.planId,
        subscriber: {
          name: {
            given_name: subscriptionData.subscriber?.firstName || 'Customer',
            surname: subscriptionData.subscriber?.lastName || ''
          },
          email_address: subscriptionData.subscriber?.email
        },
        application_context: {
          brand_name: 'BoliBooks',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
          },
          return_url: subscriptionData.returnUrl || `${process.env.FRONTEND_URL}/subscription/success`,
          cancel_url: subscriptionData.cancelUrl || `${process.env.FRONTEND_URL}/subscription/cancel`
        }
      };

      if (subscriptionData.metadata) {
        subscriptionPayload.custom_id = JSON.stringify(subscriptionData.metadata);
      }

      request.requestBody(subscriptionPayload);

      const response = await this.client.execute(request);
      
      return {
        success: true,
        data: {
          subscriptionId: response.result.id,
          status: response.result.status,
          approvalUrl: response.result.links.find(link => link.rel === 'approve')?.href,
          subscription: response.result
        }
      };
    } catch (error) {
      console.error('PayPal create subscription error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create PayPal subscription',
        type: 'paypal_error'
      };
    }
  }

  async getSubscription(subscriptionId) {
    try {
      if (!this.isInitialized()) {
        return {
          success: false,
          error: 'PayPal service not initialized',
          type: 'service_error'
        };
      }

      const request = new paypalHttp.subscriptions.SubscriptionsGetRequest(subscriptionId);
      const response = await this.client.execute(request);
      
      return {
        success: true,
        data: {
          subscription: response.result
        }
      };
    } catch (error) {
      console.error('PayPal get subscription error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get PayPal subscription',
        type: 'paypal_error'
      };
    }
  }

  async cancelSubscription(subscriptionId, reason = 'User requested cancellation') {
    try {
      if (!this.isInitialized()) {
        return {
          success: false,
          error: 'PayPal service not initialized',
          type: 'service_error'
        };
      }

      const request = new paypalHttp.subscriptions.SubscriptionsCancelRequest(subscriptionId);
      request.requestBody({ reason });

      await this.client.execute(request);
      
      return {
        success: true,
        data: {
          subscriptionId,
          status: 'cancelled'
        }
      };
    } catch (error) {
      console.error('PayPal cancel subscription error:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel PayPal subscription',
        type: 'paypal_error'
      };
    }
  }

  async verifyWebhook(headers, body) {
    try {
      if (!this.isInitialized()) {
        return {
          success: false,
          error: 'PayPal service not initialized',
          type: 'service_error'
        };
      }

      // PayPal webhook verification would typically involve:
      // 1. Verifying the certificate chain
      // 2. Verifying the signature
      // 3. Validating the webhook ID
      
      // For now, we'll do basic validation
      if (!headers['paypal-transmission-id'] || !headers['paypal-cert-id']) {
        return {
          success: false,
          error: 'Missing PayPal webhook headers',
          type: 'webhook_error'
        };
      }

      // Parse the webhook body
      let event;
      try {
        event = typeof body === 'string' ? JSON.parse(body) : body;
      } catch (parseError) {
        return {
          success: false,
          error: 'Invalid webhook body format',
          type: 'webhook_error'
        };
      }

      return {
        success: true,
        event
      };
    } catch (error) {
      console.error('PayPal webhook verification error:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify PayPal webhook',
        type: 'webhook_error'
      };
    }
  }

  // Utility method to generate webhook verification payload
  getWebhookVerificationPayload(headers, body) {
    return {
      auth_algo: headers['paypal-auth-algo'],
      cert_id: headers['paypal-cert-id'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: body
    };
  }
}

// Export singleton instance
module.exports = new PayPalService();
