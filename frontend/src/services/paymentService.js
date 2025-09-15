import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const paymentAPI = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
paymentAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
paymentAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const paymentService = {
  // Payment Configuration
  getPaymentConfig: async () => {
    try {
      const response = await paymentAPI.get('/payments-enhanced/config');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch payment configuration');
    }
  },

  // Stripe Payment Processing
  createStripePaymentIntent: async (paymentData) => {
    try {
      const response = await paymentAPI.post('/payments-enhanced/create-payment-intent', paymentData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create payment intent');
    }
  },

  confirmStripePayment: async (paymentId, paymentMethodId) => {
    try {
      const response = await paymentAPI.post(`/payments-enhanced/confirm-payment/${paymentId}`, {
        paymentMethodId
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to confirm payment');
    }
  },

  // PayPal Payment Processing
  getPayPalStatus: async () => {
    try {
      const response = await paymentAPI.get('/paypal/status');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to check PayPal status');
    }
  },

  createPayPalOrder: async (orderData) => {
    try {
      const response = await paymentAPI.post('/paypal/create-order', orderData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create PayPal order');
    }
  },

  capturePayPalPayment: async (paymentId) => {
    try {
      const response = await paymentAPI.post(`/paypal/capture-payment/${paymentId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to capture PayPal payment');
    }
  },

  getPayPalOrderDetails: async (orderId) => {
    try {
      const response = await paymentAPI.get(`/paypal/order/${orderId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get PayPal order details');
    }
  },

  // Subscription Management
  createSubscription: async (planId, paymentProvider = 'stripe') => {
    try {
      const endpoint = paymentProvider === 'stripe' 
        ? '/payments-enhanced/create-subscription' 
        : '/paypal/create-subscription';
      
      const response = await paymentAPI.post(endpoint, { planId });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create subscription');
    }
  },

  cancelSubscription: async (paymentProvider = 'stripe', reason = 'User requested cancellation') => {
    try {
      const endpoint = paymentProvider === 'stripe'
        ? '/payments-enhanced/cancel-subscription'
        : '/paypal/cancel-subscription';
      
      const payload = paymentProvider === 'paypal' ? { reason } : {};
      const response = await paymentAPI.post(endpoint, payload);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to cancel subscription');
    }
  },

  // Payment History
  getPaymentHistory: async (params = {}) => {
    try {
      const response = await paymentAPI.get('/payments-enhanced/history', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch payment history');
    }
  },

  // Subscription Plans
  getSubscriptionPlans: async () => {
    try {
      const response = await paymentAPI.get('/subscription-plans');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch subscription plans');
    }
  },

  // POS Integration
  processPosSale: async (saleData) => {
    try {
      const response = await paymentAPI.post('/pos/sales', saleData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to process POS sale');
    }
  },

  // Payment Methods Helper
  getAvailablePaymentMethods: async () => {
    try {
      const config = await paymentService.getPaymentConfig();
      return {
        stripe: config.data?.stripe?.available || false,
        paypal: config.data?.paypal?.available || false,
        cash: true,
        card: true,
        bank_transfer: true,
        supportedMethods: config.data?.supportedMethods || ['cash', 'card', 'bank_transfer'],
        currencies: config.data?.currencies || ['USD']
      };
    } catch (error) {
      // Return default payment methods if API fails
      return {
        stripe: false,
        paypal: false,
        cash: true,
        card: true,
        bank_transfer: true,
        supportedMethods: ['cash', 'card', 'bank_transfer'],
        currencies: ['USD']
      };
    }
  },

  // Error handling helper
  handlePaymentError: (error) => {
    if (error.type === 'card_error' || error.type === 'validation_error') {
      return error.message;
    } else {
      return 'An unexpected error occurred. Please try again.';
    }
  }
};

export default paymentService;
