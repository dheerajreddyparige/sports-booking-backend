/**
 * Test Flow Completion Webhook
 * This script simulates a flow completion webhook request to test payment message generation
 */
require('dotenv').config();
const axios = require('axios');

// Server URL (update with your actual server URL)
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

// Test phone number (replace with your actual test number)
const TEST_PHONE = process.env.TEST_PHONE_NUMBER || '918121627628';

/**
 * Simulate a flow completion webhook request
 * @returns {Promise<Object>} - API response
 */
async function simulateFlowCompletion() {
  try {
    console.log('Simulating flow completion webhook...');
    
    // Generate test booking data
    const bookingId = 'BK' + Date.now();
    const flowToken = 'TEST_FLOW_' + Date.now();
    
    // Create flow completion payload
    const payload = {
      to: TEST_PHONE,
      flow_token: flowToken,
      payload: {
        booking_id: bookingId,
        sport: 'badminton',
        date: new Date().toISOString().split('T')[0],
        time_slot: '18:00',
        duration: 2,
        total_amount: 1200,
        name: 'Test User',
        email: 'test@example.com'
      }
    };
    
    console.log('Flow completion payload:', JSON.stringify(payload, null, 2));
    
    // Send request to the webhook endpoint
    const response = await axios.post(
      `${SERVER_URL}/api/whatsapp/flows/flow-completion`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout
      }
    );
    
    console.log('✅ Flow completion webhook simulated successfully!');
    console.log('Response:', response.data);
    
    console.log('\nNext steps:');
    console.log('1. Check your WhatsApp for the payment message');
    console.log('2. If no message appears, check server logs for errors');
    
    return response.data;
  } catch (error) {
    console.error('❌ Error simulating flow completion webhook:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
simulateFlowCompletion().catch(console.error); 