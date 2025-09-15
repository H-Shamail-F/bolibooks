const axios = require('axios');

async function testFrontendFlow() {
    console.log('🔄 Simulating Frontend App Flow...\n');
    
    try {
        // Step 1: Test the initial auth check (what useAuth does on load)
        console.log('1️⃣ Testing initial auth check (useAuth hook)...');
        
        // Check if there's a stored token (simulating localStorage check)
        // In real app, if no token, it should show login page
        
        try {
            // This simulates what happens when React app tries to call getMe() without a token
            const authCheck = await axios.get('http://localhost:5000/api/auth/me', {
                timeout: 5000,
                validateStatus: () => true
            });
            
            if (authCheck.status === 401) {
                console.log('  ✅ Auth check returned 401 (expected for no token) - should show login page');
            } else {
                console.log(`  ⚠️ Unexpected auth check status: ${authCheck.status}`);
            }
        } catch (error) {
            console.log(`  ❌ Auth check failed: ${error.message}`);
        }
        
        // Step 2: Test login flow (what happens when user submits login form)
        console.log('\n2️⃣ Testing login flow...');
        
        try {
            const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
                email: 'demo@bolibooks.com',
                password: 'demo123'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'http://localhost:3000'
                },
                timeout: 5000
            });
            
            if (loginResponse.status === 200 && loginResponse.data.token) {
                console.log('  ✅ Login successful - token received');
                console.log(`  ✅ User: ${loginResponse.data.user.email}`);
                
                // Step 3: Test authenticated API calls
                console.log('\n3️⃣ Testing authenticated API calls...');
                
                const token = loginResponse.data.token;
                const apiCalls = [
                    { name: 'User Profile', url: '/auth/me' },
                    { name: 'Dashboard Stats', url: '/reports/dashboard-stats' },
                    { name: 'Customers', url: '/customers' }
                ];
                
                for (const call of apiCalls) {
                    try {
                        const response = await axios.get(`http://localhost:5000/api${call.url}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Origin': 'http://localhost:3000'
                            },
                            timeout: 5000
                        });
                        
                        if (response.status === 200) {
                            console.log(`  ✅ ${call.name}: Working`);
                        } else {
                            console.log(`  ❌ ${call.name}: Status ${response.status}`);
                        }
                    } catch (error) {
                        console.log(`  ❌ ${call.name}: ${error.response?.status || 'Network Error'}`);
                    }
                }
                
            } else {
                console.log('  ❌ Login failed - no token received');
            }
            
        } catch (error) {
            console.log(`  ❌ Login request failed: ${error.message}`);
        }
        
        // Step 4: Check for specific React routing issues
        console.log('\n4️⃣ Checking React Router configuration...');
        
        // The main issue might be that React Router is not handling routes properly
        // This could happen if:
        // 1. React Router is not properly initialized
        // 2. There's a JavaScript error preventing routing
        // 3. The build is serving a production build instead of development
        
        console.log('\n💡 Possible Issues:');
        console.log('  1. React app loads but JavaScript routing fails');
        console.log('  2. Authentication state not properly managed');
        console.log('  3. API calls failing causing app to show error state');
        console.log('  4. Browser cache showing old version of the app');
        
        console.log('\n🔧 SOLUTION STEPS:');
        console.log('  1. Open browser to http://localhost:3000');
        console.log('  2. Press F12 to open Developer Tools');
        console.log('  3. Check Console tab for JavaScript errors');
        console.log('  4. Check Network tab - look for failed API requests');
        console.log('  5. Try hard refresh (Ctrl+Shift+R)');
        console.log('  6. If login page shows, use: demo@bolibooks.com / demo123');
        
    } catch (error) {
        console.log(`❌ Frontend flow test failed: ${error.message}`);
    }
}

testFrontendFlow();
