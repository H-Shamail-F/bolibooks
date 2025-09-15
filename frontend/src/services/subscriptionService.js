import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class SubscriptionService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/subscriptions`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all available subscription plans
   */
  async getPlans() {
    try {
      const response = await this.api.get('/plans');
      return response.data;
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }
  }

  /**
   * Get current company subscription
   */
  async getCurrentSubscription() {
    try {
      const response = await this.api.get('/current');
      return response.data;
    } catch (error) {
      console.error('Error fetching current subscription:', error);
      throw error;
    }
  }

  /**
   * Subscribe to a plan
   */
  async subscribe(planId, billingPeriod, paymentMethodId = null) {
    try {
      const response = await this.api.post('/subscribe', {
        planId,
        billingPeriod,
        paymentMethodId
      });
      return response.data;
    } catch (error) {
      console.error('Error subscribing to plan:', error);
      throw error;
    }
  }

  /**
   * Change subscription plan
   */
  async changePlan(planId, billingPeriod = null) {
    try {
      const response = await this.api.put('/change-plan', {
        planId,
        billingPeriod
      });
      return response.data;
    } catch (error) {
      console.error('Error changing plan:', error);
      throw error;
    }
  }

  /**
   * Add add-on to subscription
   */
  async addAddOn(addOnType, quantity = 1) {
    try {
      const response = await this.api.post('/add-ons', {
        addOnType,
        quantity
      });
      return response.data;
    } catch (error) {
      console.error('Error adding add-on:', error);
      throw error;
    }
  }

  /**
   * Remove add-on from subscription
   */
  async removeAddOn(addOnType) {
    try {
      const response = await this.api.delete(`/add-ons/${addOnType}`);
      return response.data;
    } catch (error) {
      console.error('Error removing add-on:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(reason, cancelImmediately = false) {
    try {
      const response = await this.api.post('/cancel', {
        reason,
        cancelImmediately
      });
      return response.data;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Get billing history
   */
  async getBillingHistory(page = 1, limit = 20) {
    try {
      const response = await this.api.get('/billing-history', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching billing history:', error);
      throw error;
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats() {
    try {
      const response = await axios.get('/api/companies/usage-stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();
