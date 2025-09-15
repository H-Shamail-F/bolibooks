const axios = require('axios');

async function testPortal() {
    console.log('🧪 Testing Internal Portal Functionality...\n');
    
    const API_BASE = 'http://localhost:5000/api';
    let token;
    
    try {
        // 1. Login to get authentication token
        console.log('1. Testing Authentication...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@testcompany.com',
            password: 'password123'
        });
        
        if (loginResponse.data.token) {
            token = loginResponse.data.token;
            console.log('✅ Authentication successful');
        } else {
            throw new Error('No token received');
        }
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // 2. Test company info endpoint
        console.log('\n2. Testing Company Info Endpoint...');
        const companyInfoResponse = await axios.get(`${API_BASE}/portal/company-info`, { headers });
        
        if (companyInfoResponse.status === 200) {
            console.log('✅ Company info retrieved successfully');
            console.log(`   Company: ${companyInfoResponse.data.company.name}`);
            console.log(`   Templates: ${companyInfoResponse.data.templates.length} found`);
        }
        
        // 3. Test products endpoint
        console.log('\n3. Testing Products Endpoint...');
        const productsResponse = await axios.get(`${API_BASE}/portal/products`, { headers });
        
        if (productsResponse.status === 200) {
            console.log('✅ Products retrieved successfully');
            const productCount = Object.values(productsResponse.data.products || {}).flat().length;
            console.log(`   Products: ${productCount} found`);
        }
        
        // 4. Test customers endpoint
        console.log('\n4. Testing Customers Endpoint...');
        const customersResponse = await axios.get(`${API_BASE}/portal/customers`, { headers });
        
        if (customersResponse.status === 200) {
            console.log('✅ Customers retrieved successfully');
            console.log(`   Customers: ${customersResponse.data.customers.length} found`);
        }
        
        // 5. Test documents listing
        console.log('\n5. Testing Documents Listing...');
        const documentsResponse = await axios.get(`${API_BASE}/portal/documents`, { headers });
        
        if (documentsResponse.status === 200) {
            console.log('✅ Documents retrieved successfully');
            console.log(`   Documents: ${documentsResponse.data.documents.length} found`);
        }
        
        // 6. Test document creation (if we have customers and products)
        if (customersResponse.data.customers.length > 0) {
            const products = Object.values(productsResponse.data.products || {}).flat();
            if (products.length > 0) {
                console.log('\n6. Testing Document Creation...');
                
                const customerId = customersResponse.data.customers[0].id;
                const product = products[0];
                
                const createDocumentData = {
                    type: 'quote',
                    customerId: customerId,
                    items: [{
                        productId: product.id,
                        quantity: 2
                    }],
                    notes: 'Test quotation created via internal portal test'
                };
                
                const createResponse = await axios.post(`${API_BASE}/portal/create-document`, createDocumentData, { headers });
                
                if (createResponse.status === 201) {
                    console.log('✅ Document creation successful');
                    console.log(`   Document Number: ${createResponse.data.documentNumber}`);
                    console.log(`   Document ID: ${createResponse.data.documentId}`);
                    
                    // 7. Test document retrieval
                    console.log('\n7. Testing Document Retrieval...');
                    const docResponse = await axios.get(`${API_BASE}/portal/document/${createResponse.data.documentId}`, { headers });
                    
                    if (docResponse.status === 200) {
                        console.log('✅ Document retrieval successful');
                        console.log(`   Retrieved: ${docResponse.data.document.invoiceNumber} - ${docResponse.data.document.type}`);
                    }
                }
            } else {
                console.log('\n6. ⚠️  Skipping document creation - no products available');
            }
        } else {
            console.log('\n6. ⚠️  Skipping document creation - no customers available');
        }
        
        console.log('\n🎉 All Portal Tests Completed Successfully!');
        console.log('\n📝 Summary:');
        console.log('   ✅ Authentication works');
        console.log('   ✅ Company info endpoint works');
        console.log('   ✅ Products endpoint works');
        console.log('   ✅ Customers endpoint works');
        console.log('   ✅ Documents listing works');
        console.log('   ✅ Document creation works (if data available)');
        console.log('   ✅ Document retrieval works (if document created)');
        
        console.log('\n🌐 Frontend Portal Access:');
        console.log('   URL: http://localhost:3000/portal');
        console.log('   Login: admin@testcompany.com / password123');
        
    } catch (error) {
        console.log('\n❌ ERROR DETECTED:');
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Error:', error.response.data?.error || error.response.data?.message);
            console.log('   Details:', error.response.data);
        } else if (error.request) {
            console.log('   Network Error:', error.message);
            console.log('   Cannot reach server at', API_BASE);
        } else {
            console.log('   Error:', error.message);
        }
        
        console.log('\n🔧 TROUBLESHOOTING:');
        console.log('   1. Ensure backend server is running: npm run backend:dev');
        console.log('   2. Check database has test data: node backend/create-test-user.js');
        console.log('   3. Verify port 5000 is available');
        console.log('   4. Check authentication credentials');
    }
}

testPortal();
