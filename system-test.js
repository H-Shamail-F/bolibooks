#!/usr/bin/env node
/**
 * BoliBooks System Test
 * Comprehensive test of backend APIs, authentication, and POS functionality
 */

const axios = require('axios');
const colors = require('colors');

const API_BASE = 'http://localhost:5000/api';
const FRONTEND_URL = 'http://localhost:3000';

class BoliBooksTester {
    constructor() {
        this.token = null;
        this.userId = null;
        this.companyId = null;
        this.productId = null;
        this.saleId = null;
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const colors_map = {
            'info': 'cyan',
            'success': 'green', 
            'error': 'red',
            'warning': 'yellow'
        };
        console.log(`[${timestamp}] ${message}`[colors_map[type]]);
    }

    async test(name, testFn) {
        try {
            this.log(`🧪 Testing: ${name}`, 'info');
            await testFn();
            this.log(`✅ PASSED: ${name}`, 'success');
            this.results.passed++;
            this.results.tests.push({ name, status: 'PASSED' });
        } catch (error) {
            this.log(`❌ FAILED: ${name} - ${error.message}`, 'error');
            this.results.failed++;
            this.results.tests.push({ name, status: 'FAILED', error: error.message });
        }
    }

    async testHealthCheck() {
        const response = await axios.get(`${API_BASE}/health`);
        if (response.data.status !== 'OK') {
            throw new Error('Health check failed');
        }
        this.log(`Health Status: ${response.data.message}`, 'info');
    }

    async testLogin() {
        const loginData = {
            email: 'admin@testcompany.com',
            password: 'password123'
        };
        
        const response = await axios.post(`${API_BASE}/auth/login`, loginData);
        if (!response.data.success || !response.data.token) {
            throw new Error('Login failed - no token received');
        }
        
        this.token = response.data.token;
        this.userId = response.data.user.id;
        this.companyId = response.data.user.companyId;
        
        this.log(`Logged in as: ${response.data.user.firstName} ${response.data.user.lastName}`, 'info');
    }

    async testProducts() {
        const config = { headers: { Authorization: `Bearer ${this.token}` } };
        
        // Get products
        const response = await axios.get(`${API_BASE}/products`, config);
        if (!response.data.success || !Array.isArray(response.data.data)) {
            throw new Error('Failed to fetch products');
        }
        
        const products = response.data.data;
        this.log(`Found ${products.length} products`, 'info');
        
        if (products.length > 0) {
            this.productId = products[0].id;
            this.log(`Using product: ${products[0].name} (ID: ${this.productId})`, 'info');
        }
    }

    async testPOSProducts() {
        const config = { headers: { Authorization: `Bearer ${this.token}` } };
        
        const response = await axios.get(`${API_BASE}/pos/products?inStock=false`, config);
        if (!response.data.success) {
            throw new Error('Failed to fetch POS products');
        }
        
        const products = response.data.data.products;
        this.log(`POS Products available: ${products.length}`, 'info');
        
        if (products.length === 0) {
            throw new Error('No POS products available for testing');
        }
    }

    async testBarcodeScanning() {
        if (!this.productId) {
            throw new Error('No product ID available for barcode test');
        }
        
        const config = { headers: { Authorization: `Bearer ${this.token}` } };
        
        // First get a product with barcode
        const productResponse = await axios.get(`${API_BASE}/products/${this.productId}`, config);
        const product = productResponse.data.data;
        
        if (!product.barcode) {
            this.log('Product has no barcode, skipping barcode scan test', 'warning');
            return;
        }
        
        // Test barcode scanning
        const scanResponse = await axios.get(`${API_BASE}/pos/scan/${product.barcode}`, config);
        if (!scanResponse.data.success) {
            throw new Error('Barcode scanning failed');
        }
        
        this.log(`Barcode scan successful for: ${scanResponse.data.data.name}`, 'info');
    }

    async testPOSSaleCreation() {
        if (!this.productId) {
            throw new Error('No product ID available for sale creation');
        }
        
        const config = { headers: { Authorization: `Bearer ${this.token}` } };
        
        const saleData = {
            items: [{
                productId: this.productId,
                quantity: 1
            }],
            paymentMethod: 'cash',
            amountTendered: 100,
            notes: 'Test sale from system test'
        };
        
        const response = await axios.post(`${API_BASE}/pos/sales`, saleData, config);
        if (!response.data.success) {
            throw new Error(`POS sale creation failed: ${response.data.message || 'Unknown error'}`);
        }
        
        this.saleId = response.data.data.id;
        this.log(`Created POS sale: ${response.data.data.saleNumber} (ID: ${this.saleId})`, 'info');
    }

    async testReports() {
        const config = { headers: { Authorization: `Bearer ${this.token}` } };
        
        // Test dashboard stats
        const dashboardResponse = await axios.get(`${API_BASE}/reports/dashboard`, config);
        if (!dashboardResponse.data.success) {
            throw new Error('Dashboard stats failed');
        }
        
        this.log(`Dashboard stats loaded successfully`, 'info');
        
        // Test daily POS report
        const dailyResponse = await axios.get(`${API_BASE}/pos/reports/daily`, config);
        if (!dailyResponse.data.success) {
            throw new Error('Daily POS report failed');
        }
        
        this.log(`Daily POS report generated successfully`, 'info');
    }

    async testFrontendConnectivity() {
        try {
            const response = await axios.get(FRONTEND_URL, { timeout: 10000 });
            if (response.status === 200) {
                this.log('Frontend is accessible and responding', 'info');
            }
        } catch (error) {
            throw new Error(`Frontend connectivity failed: ${error.message}`);
        }
    }

    async testPaymentEndpoints() {
        const config = { headers: { Authorization: `Bearer ${this.token}` } };
        
        // Test payment intent creation (will fail without valid Stripe keys, but should not crash)
        try {
            const paymentData = {
                amount: 1000,
                currency: 'usd',
                customerId: null
            };
            
            await axios.post(`${API_BASE}/payments/stripe/create-intent`, paymentData, config);
            this.log('Stripe payment intent endpoint is functional', 'info');
        } catch (error) {
            // Expected to fail without valid keys
            if (error.response?.status === 400 || error.response?.status === 401) {
                this.log('Payment endpoint reachable (expected auth failure)', 'info');
            } else {
                throw error;
            }
        }
    }

    async runAllTests() {
        console.log('🚀 Starting BoliBooks System Test Suite'.green.bold);
        console.log('=' * 60);
        
        const testSuite = [
            ['Backend Health Check', () => this.testHealthCheck()],
            ['User Authentication', () => this.testLogin()],
            ['Product Management', () => this.testProducts()],
            ['POS Products Endpoint', () => this.testPOSProducts()],
            ['Barcode Scanning', () => this.testBarcodeScanning()],
            ['POS Sale Creation', () => this.testPOSSaleCreation()],
            ['Reports Generation', () => this.testReports()],
            ['Frontend Connectivity', () => this.testFrontendConnectivity()],
            ['Payment Endpoints', () => this.testPaymentEndpoints()]
        ];
        
        for (const [name, testFn] of testSuite) {
            await this.test(name, testFn);
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
        }
        
        this.printResults();
    }

    printResults() {
        console.log('\n' + '=' * 60);
        console.log('📊 Test Results Summary'.bold);
        console.log('=' * 60);
        
        const total = this.results.passed + this.results.failed;
        const passRate = total > 0 ? (this.results.passed / total * 100).toFixed(1) : 0;
        
        console.log(`✅ Passed: ${this.results.passed}`.green);
        console.log(`❌ Failed: ${this.results.failed}`.red);
        console.log(`📈 Pass Rate: ${passRate}%`[passRate >= 80 ? 'green' : passRate >= 60 ? 'yellow' : 'red']);
        
        if (this.results.failed > 0) {
            console.log('\n❌ Failed Tests:'.red.bold);
            this.results.tests
                .filter(test => test.status === 'FAILED')
                .forEach(test => {
                    console.log(`   • ${test.name}: ${test.error}`.red);
                });
        }
        
        console.log('\n' + '=' * 60);
        
        if (passRate >= 80) {
            console.log('🎉 System is in good condition!'.green.bold);
        } else if (passRate >= 60) {
            console.log('⚠️  System has some issues that need attention.'.yellow.bold);
        } else {
            console.log('🚨 System has critical issues that need immediate attention.'.red.bold);
        }
        
        console.log('\n💡 Next Steps:'.cyan.bold);
        if (this.results.failed === 0) {
            console.log('   • Open http://localhost:3000 to use BoliBooks');
            console.log('   • Test the POS interface');
            console.log('   • Configure payment credentials for live use');
        } else {
            console.log('   • Fix failed tests above');
            console.log('   • Ensure both backend and frontend are running');
            console.log('   • Check server logs for detailed error information');
        }
    }
}

// Run the test suite
async function main() {
    const tester = new BoliBooksTester();
    
    try {
        await tester.runAllTests();
        process.exit(tester.results.failed > 0 ? 1 : 0);
    } catch (error) {
        console.error('🚨 Test suite crashed:'.red.bold, error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = BoliBooksTester;
