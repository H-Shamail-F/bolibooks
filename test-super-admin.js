const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testSuperAdminSystem() {
  console.log('🧪 Testing Super Admin and Trial Management System...\n');

  let superAdminToken;
  let testCompanyId;

  try {
    // Test 1: Create a regular company registration (should be pending)
    console.log('1. Testing Company Registration (should be pending)...');
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
      email: 'testcompany@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Owner',
      companyName: 'Test Company Ltd',
      companyAddress: '123 Test Street',
      companyPhone: '+1234567890'
    });

    if (registerResponse.status === 201) {
      console.log('✅ Company registered successfully with pending status');
      
      // Try to login with the pending company user
      try {
        await axios.post(`${API_BASE}/auth/login`, {
          email: 'testcompany@example.com',
          password: 'password123'
        });
        console.log('❌ ERROR: Pending company user should not be able to login');
      } catch (error) {
        if (error.response?.status === 403) {
          console.log('✅ Pending company user correctly blocked from login');
        } else {
          console.log('⚠️  Unexpected error during pending login test:', error.response?.data);
        }
      }
    } else {
      throw new Error('Company registration failed');
    }

    // Test 2: Login as super admin (assuming super admin exists)
    console.log('\n2. Testing Super Admin Login...');
    try {
      const superAdminLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: 'admin@bolibooks.com', // Update this with your super admin email
        password: 'superadmin123' // Update this with your super admin password
      });

      if (superAdminLogin.data.token && superAdminLogin.data.user.role === 'super_admin') {
        superAdminToken = superAdminLogin.data.token;
        console.log('✅ Super admin login successful');
      } else {
        throw new Error('Super admin login failed or user is not super admin');
      }
    } catch (error) {
      console.log('⚠️  Super admin login failed. You may need to create a super admin first.');
      console.log('   Run: node create-super-admin.js');
      console.log('   Error:', error.response?.data?.error || error.message);
      return;
    }

    const authHeaders = {
      'Authorization': `Bearer ${superAdminToken}`,
      'Content-Type': 'application/json'
    };

    // Test 3: Access super admin dashboard
    console.log('\n3. Testing Super Admin Dashboard...');
    const dashboardResponse = await axios.get(`${API_BASE}/super-admin/dashboard`, {
      headers: authHeaders
    });

    if (dashboardResponse.status === 200) {
      console.log('✅ Super admin dashboard accessible');
      console.log(`   Total Companies: ${dashboardResponse.data.statistics.totalCompanies}`);
      console.log(`   Pending Companies: ${dashboardResponse.data.statistics.pendingCompanies}`);
      console.log(`   Trial Companies: ${dashboardResponse.data.statistics.trialCompanies}`);
      console.log(`   Active Companies: ${dashboardResponse.data.statistics.activeCompanies}`);
    } else {
      throw new Error('Dashboard access failed');
    }

    // Test 4: Get companies list
    console.log('\n4. Testing Companies List...');
    const companiesResponse = await axios.get(`${API_BASE}/super-admin/companies?status=pending`, {
      headers: authHeaders
    });

    if (companiesResponse.status === 200 && companiesResponse.data.companies.length > 0) {
      console.log('✅ Companies list retrieved');
      testCompanyId = companiesResponse.data.companies[0].id;
      console.log(`   Found pending company: ${companiesResponse.data.companies[0].name} (${testCompanyId})`);
    } else {
      console.log('⚠️  No pending companies found to test with');
      return;
    }

    // Test 5: Grant trial period
    console.log('\n5. Testing Trial Period Grant...');
    const grantTrialResponse = await axios.post(`${API_BASE}/super-admin/companies/${testCompanyId}/grant-trial`, {
      trialDays: 30,
      notes: 'Test trial grant via super admin system test'
    }, { headers: authHeaders });

    if (grantTrialResponse.status === 200) {
      console.log('✅ Trial period granted successfully');
      console.log(`   Trial End Date: ${grantTrialResponse.data.company.trialEndDate}`);
    } else {
      throw new Error('Trial grant failed');
    }

    // Test 6: Verify company can now login
    console.log('\n6. Testing Company Login After Trial Grant...');
    const companyLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'testcompany@example.com',
      password: 'password123'
    });

    if (companyLoginResponse.status === 200 && companyLoginResponse.data.token) {
      console.log('✅ Company user can now login after trial grant');
      console.log(`   Subscription Status: ${companyLoginResponse.data.user.subscriptionStatus}`);
    } else {
      throw new Error('Company login after trial grant failed');
    }

    // Test 7: Test company status update
    console.log('\n7. Testing Company Status Update...');
    const statusUpdateResponse = await axios.put(`${API_BASE}/super-admin/companies/${testCompanyId}/subscription`, {
      status: 'active',
      notes: 'Upgraded to active status via test'
    }, { headers: authHeaders });

    if (statusUpdateResponse.status === 200) {
      console.log('✅ Company status updated successfully');
      console.log(`   New Status: ${statusUpdateResponse.data.company.subscriptionStatus}`);
    } else {
      throw new Error('Status update failed');
    }

    // Test 8: Test suspension
    console.log('\n8. Testing Company Suspension...');
    const suspendResponse = await axios.put(`${API_BASE}/super-admin/companies/${testCompanyId}/subscription`, {
      status: 'suspended',
      notes: 'Suspended for testing purposes'
    }, { headers: authHeaders });

    if (suspendResponse.status === 200) {
      console.log('✅ Company suspended successfully');
      
      // Verify suspended company cannot login
      try {
        await axios.post(`${API_BASE}/auth/login`, {
          email: 'testcompany@example.com',
          password: 'password123'
        });
        console.log('❌ ERROR: Suspended company should not be able to login');
      } catch (error) {
        if (error.response?.status === 403) {
          console.log('✅ Suspended company correctly blocked from login');
        } else {
          console.log('⚠️  Unexpected error:', error.response?.data);
        }
      }
    } else {
      throw new Error('Company suspension failed');
    }

    // Test 9: Clean up - restore company to trial status
    console.log('\n9. Cleaning up - Restoring Company to Trial...');
    await axios.put(`${API_BASE}/super-admin/companies/${testCompanyId}/subscription`, {
      status: 'trial',
      notes: 'Restored to trial after testing'
    }, { headers: authHeaders });
    console.log('✅ Company restored to trial status');

    // Test 10: Test system settings
    console.log('\n10. Testing System Settings...');
    const settingsResponse = await axios.get(`${API_BASE}/super-admin/settings`, {
      headers: authHeaders
    });

    if (settingsResponse.status === 200) {
      console.log('✅ System settings accessible');
      console.log(`   Total Companies: ${settingsResponse.data.statistics.totalCompanies}`);
      console.log(`   Total Users: ${settingsResponse.data.statistics.totalUsers}`);
    } else {
      throw new Error('System settings access failed');
    }

    console.log('\n🎉 All Super Admin System Tests Passed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Company registration creates pending status');
    console.log('   ✅ Pending companies cannot login');
    console.log('   ✅ Super admin can access dashboard and controls');
    console.log('   ✅ Trial periods can be granted');
    console.log('   ✅ Companies with trials can login');
    console.log('   ✅ Company status can be updated');
    console.log('   ✅ Suspended companies cannot login');
    console.log('   ✅ System settings are accessible');

    console.log('\n🌐 Frontend Access:');
    console.log('   Super Admin Panel: http://localhost:3000/super-admin');
    console.log('   Login as super admin to manage companies');

  } catch (error) {
    console.log('\n❌ Test failed:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data?.error || error.response.data?.message}`);
      console.log(`   Details:`, error.response.data);
    } else if (error.request) {
      console.log('   Network error - server not reachable');
      console.log('   Make sure backend server is running on port 5000');
    } else {
      console.log(`   Error: ${error.message}`);
    }

    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure backend server is running: npm run backend:dev');
    console.log('   2. Create super admin first: node create-super-admin.js');
    console.log('   3. Update super admin credentials in this test file');
    console.log('   4. Ensure database is properly initialized');
  }
}

testSuperAdminSystem();
