const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function createSuperAdmin() {
  console.log('🔐 BoliBooks Super Admin Setup');
  console.log('================================\n');
  
  try {
    // Get user inputs
    const email = await question('Enter super admin email: ');
    const password = await question('Enter super admin password (min 8 characters): ');
    const firstName = await question('Enter first name: ');
    const lastName = await question('Enter last name: ');
    const masterKey = await question('Enter master key (set in SUPER_ADMIN_MASTER_KEY env var): ');

    console.log('\n🔄 Creating super admin user...\n');

    // Make the request
    const response = await axios.post('http://localhost:5000/api/super-admin/create-super-admin', {
      email,
      password,
      firstName,
      lastName,
      masterKey
    });

    if (response.status === 201) {
      console.log('✅ Super admin created successfully!');
      console.log('\n📋 Super Admin Details:');
      console.log(`   Name: ${response.data.user.firstName} ${response.data.user.lastName}`);
      console.log(`   Email: ${response.data.user.email}`);
      console.log(`   Role: ${response.data.user.role}`);
      console.log(`   User ID: ${response.data.user.id}`);
      
      console.log('\n🌐 Access the Super Admin Panel:');
      console.log('   1. Go to: http://localhost:3000/login');
      console.log(`   2. Login with: ${email}`);
      console.log('   3. Navigate to: http://localhost:3000/super-admin');
      
      console.log('\n🔧 What you can do:');
      console.log('   • View system dashboard and statistics');
      console.log('   • Manage all companies and their subscription status');
      console.log('   • Grant trial periods to pending companies');
      console.log('   • Suspend or activate company accounts');
      console.log('   • View company details and usage statistics');
      
      console.log('\n⚠️  Important Security Notes:');
      console.log('   • Keep your super admin credentials secure');
      console.log('   • Change the SUPER_ADMIN_MASTER_KEY environment variable');
      console.log('   • Only one super admin account can exist at a time');
      console.log('   • Super admin has full system access');

    } else {
      console.log('❌ Failed to create super admin');
      console.log('Response:', response.data);
    }

  } catch (error) {
    console.log('\n❌ Error creating super admin:');
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data?.error || 'Unknown error'}`);
      
      if (error.response.status === 400) {
        if (error.response.data?.error?.includes('Super admin already exists')) {
          console.log('\n💡 A super admin already exists in the system.');
          console.log('   If you need to reset it, you\'ll need to:');
          console.log('   1. Access the database directly');
          console.log('   2. Delete or update the existing super admin user');
          console.log('   3. Run this script again');
        }
        if (error.response.data?.error?.includes('User with this email already exists')) {
          console.log('\n💡 A user with this email already exists.');
          console.log('   Try using a different email address.');
        }
      }
      
      if (error.response.status === 403) {
        console.log('\n💡 Invalid master key.');
        console.log('   Make sure to set the SUPER_ADMIN_MASTER_KEY environment variable');
        console.log('   in your backend/.env file, or use the default: "change-this-master-key-123"');
      }
      
      if (error.response.data?.errors) {
        console.log('\n📝 Validation errors:');
        error.response.data.errors.forEach(err => {
          console.log(`   • ${err.msg} (${err.param})`);
        });
      }
    } else if (error.request) {
      console.log('   Network error: Cannot reach the server');
      console.log('   Make sure the backend server is running on http://localhost:5000');
      console.log('   Run: npm run backend:dev');
    } else {
      console.log(`   Error: ${error.message}`);
    }

    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure the backend server is running');
    console.log('   2. Check that the database is properly set up');
    console.log('   3. Verify the master key is correct');
    console.log('   4. Make sure no super admin already exists');
  } finally {
    rl.close();
  }
}

// Environment setup instructions
console.log('📋 Before running this script, ensure you have:');
console.log('   1. Backend server running (npm run backend:dev)');
console.log('   2. Database initialized');
console.log('   3. SUPER_ADMIN_MASTER_KEY environment variable set');
console.log('      (or use default: "change-this-master-key-123")');
console.log('\n');

createSuperAdmin();
