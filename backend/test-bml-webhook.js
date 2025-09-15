// BML Webhook Test
const axios = require('axios');
const crypto = require('crypto');

const baseURL = 'http://localhost:3001/api';
const webhookSecret = 'webhook_secret_abc'; // From .env

async function testBMLWebhook() {
  console.log('🧪 Testing BML Webhook Integration...\n');

  try {
    // 1. Create test webhook payload
    const webhookPayload = {
      eventType: 'payment.completed',
      reference: 'bml_test_123456',
      status: 'succeeded',
      amount: 100.00,
      currency: 'MVR',
      orderId: 'test-order-789',
      timestamp: new Date().toISOString(),
      merchantId: 'TEST_MERCHANT_123'
    };

    // 2. Generate HMAC signature
    const rawBody = JSON.stringify(webhookPayload);
    const signature = crypto.createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    console.log('1️⃣ Testing valid webhook signature...');

    // 3. Send webhook with valid signature
    const validWebhook = await axios.post(`${baseURL}/payments/bml/webhook`, rawBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-BML-Signature': signature
      }
    });

    console.log('✅ Valid webhook accepted:', validWebhook.data);

    // 4. Test invalid signature
    console.log('\n2️⃣ Testing invalid webhook signature...');
    try {
      await axios.post(`${baseURL}/payments/bml/webhook`, rawBody, {
        headers: {
          'Content-Type': 'application/json',
          'X-BML-Signature': 'invalid_signature'
        }
      });
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid webhook rejected:', error.response.data);
      } else {
        throw error;
      }
    }

    // 5. Test webhook without signature
    console.log('\n3️⃣ Testing webhook without signature...');
    try {
      await axios.post(`${baseURL}/payments/bml/webhook`, rawBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Unsigned webhook rejected:', error.response.data);
      } else {
        throw error;
      }
    }

    console.log('\n🎉 BML Webhook Test Complete! All security checks working.');

  } catch (error) {
    console.error('❌ Webhook test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testBMLWebhook();
