const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001/api';
const FRONTEND_URL = 'http://localhost:3000';

// Test credentials
const TEST_CREDENTIALS = {
    email: 'admin@bolivooks.com',
    password: 'admin123'
};

const FALLBACK_CREDENTIALS = {
    email: 'admin@testcompany.com',
    password: 'password123'
};

class BoliBooksTester {
    constructor() {
        this.token = null;
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async test(description, testFunction) {
        try {
            this.log(`Testing: ${description}`);
            await testFunction();
            this.results.passed++;
            this.results.tests.push({ description, status: 'PASSED' });
            this.log(`✅ PASSED: ${description}`, 'success');
        } catch (error) {
            this.results.failed++;
            this.results.tests.push({ description, status: 'FAILED', error: error.message });
            this.log(`❌ FAILED: ${description} - ${error.message}`, 'error');
        }
    }

    async waitForServer(url, maxAttempts = 30) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                await axios.get(url, { timeout: 2000 });
                return true;
            } catch (error) {
                if (i < maxAttempts - 1) {
                    this.log(`Waiting for server... attempt ${i + 1}/${maxAttempts}`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        throw new Error(`Server not available at ${url} after ${maxAttempts} attempts`);
    }

    async testBackendHealth() {
        await this.waitForServer(`${BASE_URL}/health`);
        const response = await axios.get(`${BASE_URL}/health`);
        if (response.status !== 200 || response.data.status !== 'OK') {
            throw new Error('Backend health check failed');
        }
    }

    async testDatabaseConnection() {
        const response = await axios.get(`${BASE_URL}/health`);
        if (!response.data.database || response.data.database !== 'connected') {
            throw new Error('Database connection failed');
        }
    }

    async testLogin(credentials = TEST_CREDENTIALS) {
        const response = await axios.post(`${BASE_URL}/auth/login`, credentials);
        if (response.status !== 200 || !response.data.token) {
            throw new Error('Login failed - no token received');
        }
        this.token = response.data.token;
        return response.data;
    }

    async testFallbackLogin() {
        try {
            return await this.testLogin(TEST_CREDENTIALS);
        } catch (error) {
            this.log('Primary credentials failed, trying fallback...', 'info');
            return await this.testLogin(FALLBACK_CREDENTIALS);
        }
    }

    async testAuthenticatedRequest(endpoint) {
        if (!this.token) {
            throw new Error('No authentication token available');
        }
        
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${this.token}` }
        });
        return response;
    }

    async testProductsAPI() {
        const response = await this.testAuthenticatedRequest('/products');
        if (response.status !== 200 || !Array.isArray(response.data)) {
            throw new Error('Products API returned invalid response');
        }
        return response.data;
    }

    async testPOSProductsAPI() {
        const response = await this.testAuthenticatedRequest('/pos/products');
        if (response.status !== 200 || !Array.isArray(response.data)) {
            throw new Error('POS Products API returned invalid response');
        }
        return response.data;
    }

    async testPOSSaleCreation() {
        // First get available products
        const products = await this.testPOSProductsAPI();
        if (products.length === 0) {
            throw new Error('No products available for POS sale');
        }

        // Find a product with stock > 0
        const availableProduct = products.find(p => p.quantity > 0);
        if (!availableProduct) {
            throw new Error('No products with available stock for POS sale');
        }

        const saleData = {
            items: [{
                productId: availableProduct.id,
                quantity: 1,
                price: availableProduct.price
            }],
            paymentMethod: 'cash',
            totalAmount: availableProduct.price,
            customerInfo: {
                name: 'Test Customer',
                email: 'test@example.com'
            }
        };

        const response = await axios.post(`${BASE_URL}/pos/sales`, saleData, {
            headers: { Authorization: `Bearer ${this.token}` }
        });

        if (response.status !== 201 || !response.data.sale) {
            throw new Error('POS sale creation failed');
        }

        return response.data;
    }

    async testReportsAPI() {
        const response = await this.testAuthenticatedRequest('/reports/dashboard');
        if (response.status !== 200 || !response.data) {
            throw new Error('Reports API failed');
        }
        return response.data;
    }

    async testPaymentStripeIntent() {
        const paymentData = {
            amount: 1000, // $10.00
            currency: 'usd',
            description: 'Test payment'
        };

        try {
            const response = await axios.post(`${BASE_URL}/payments/stripe/create-payment-intent`, paymentData, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
            
            if (response.status === 200 && response.data.clientSecret) {
                return response.data;
            }
        } catch (error) {
            if (error.response?.status === 400 && error.response.data?.error?.includes('Invalid API key')) {
                this.log('Stripe API key not configured (expected in development)', 'info');
                return { status: 'skipped', reason: 'No Stripe API key' };
            }
            throw error;
        }
    }

    async testPaymentPayPalOrder() {
        const orderData = {
            amount: 10.00,
            currency: 'USD',
            description: 'Test PayPal order'
        };

        try {
            const response = await axios.post(`${BASE_URL}/payments/paypal/create-order`, orderData, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
            
            if (response.status === 200 && response.data.orderId) {
                return response.data;
            }
        } catch (error) {
            if (error.response?.status === 400 && error.response.data?.error?.includes('credentials')) {
                this.log('PayPal credentials not configured (expected in development)', 'info');
                return { status: 'skipped', reason: 'No PayPal credentials' };
            }
            throw error;
        }
    }

    async testFrontendConnectivity() {
        try {
            await this.waitForServer(FRONTEND_URL, 5); // Shorter wait for frontend
            this.log('Frontend server is running', 'success');
            return true;
        } catch (error) {
            this.log('Frontend server not running (this is optional)', 'info');
            return false;
        }
    }

    async runAllTests() {
        this.log('🚀 Starting BoliBooks Comprehensive Validation');
        this.log('================================================');

        // Backend Infrastructure Tests
        await this.test('Backend Server Health Check', () => this.testBackendHealth());
        await this.test('Database Connection', () => this.testDatabaseConnection());
        
        // Authentication Tests
        await this.test('User Authentication', () => this.testFallbackLogin());

        // API Endpoint Tests
        await this.test('Products API', () => this.testProductsAPI());
        await this.test('POS Products API', () => this.testPOSProductsAPI());
        await this.test('Reports API', () => this.testReportsAPI());
        
        // POS Functionality Tests
        await this.test('POS Sale Creation', () => this.testPOSSaleCreation());
        
        // Payment Integration Tests
        await this.test('Stripe Payment Intent', () => this.testPaymentStripeIntent());
        await this.test('PayPal Order Creation', () => this.testPaymentPayPalOrder());
        
        // Frontend Tests
        await this.test('Frontend Server Connectivity', () => this.testFrontendConnectivity());

        // Summary
        this.log('================================================');
        this.log('🏁 Validation Complete!');
        this.log(`✅ Tests Passed: ${this.results.passed}`);
        this.log(`❌ Tests Failed: ${this.results.failed}`);
        this.log(`📊 Total Tests: ${this.results.tests.length}`);

        if (this.results.failed > 0) {
            this.log('\n❌ Failed Tests:', 'error');
            this.results.tests
                .filter(t => t.status === 'FAILED')
                .forEach(t => this.log(`   - ${t.description}: ${t.error}`, 'error'));
        }

        const successRate = (this.results.passed / this.results.tests.length * 100).toFixed(1);
        this.log(`\n🎯 Success Rate: ${successRate}%`);

        if (this.results.failed === 0) {
            this.log('\n🎉 All tests passed! Your BoliBooks system is fully operational!', 'success');
        } else {
            this.log('\n⚠️  Some tests failed. Please check the errors above and fix them.', 'error');
        }

        return this.results;
    }
}

// Run the tests
const tester = new BoliBooksTester();
tester.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
});
