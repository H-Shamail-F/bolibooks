const axios = require('axios');

async function testRoutes() {
    console.log('🛣️ Testing Frontend Routes...\n');
    
    const routes = [
        { path: '/', name: 'Home/Root' },
        { path: '/login', name: 'Login Page' },
        { path: '/dashboard', name: 'Dashboard' },
        { path: '/customers', name: 'Customers' },
        { path: '/nonexistent', name: 'Non-existent Route' }
    ];
    
    for (const route of routes) {
        try {
            console.log(`Testing: ${route.name} (${route.path})`);
            
            const response = await axios.get(`http://localhost:3000${route.path}`, {
                timeout: 5000,
                headers: { 'Accept': 'text/html' },
                validateStatus: () => true // Accept all status codes
            });
            
            console.log(`  Status: ${response.status}`);
            console.log(`  Content-Type: ${response.headers['content-type']}`);
            
            // Check for specific error indicators
            const content = response.data.toString();
            
            if (content.includes('Cannot GET')) {
                console.log('  ❌ EXPRESS ERROR: "Cannot GET" detected - This is backend serving the route!');
            } else if (content.includes('404') || content.includes('Not Found')) {
                console.log('  ❌ 404 ERROR: Page not found');
            } else if (content.includes('id="root"')) {
                console.log('  ✅ React app detected - route working');
            } else if (content.includes('<html')) {
                console.log('  ✅ HTML page served (could be React or static)');
            } else {
                console.log('  ⚠️ Unexpected response format');
            }
            
            // Show first 100 characters of response for debugging
            const preview = content.substring(0, 150).replace(/\s+/g, ' ').trim();
            console.log(`  Preview: ${preview}...`);
            
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
        
        console.log(''); // Empty line for readability
    }
}

testRoutes();
