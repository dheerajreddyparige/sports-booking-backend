/**
 * Test Payment Flow Script
 * This script tests the full payment flow with booking creation and payment link generation
 */

const dotenv = require('dotenv');
const { saveFlowState, getFlowState } = require('../utils/flowDbUtils');
const { getNextScreen } = require('../utils/flow');

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' }); // Try to load from .env.local as well

/**
 * Test payment flow with booking creation and payment link generation
 */
async function testPaymentFlow() {
  console.log('Testing full payment flow with booking creation and payment link generation...');
  
  const testFlowToken = `test-payment-flow-${Date.now()}`;
  
  // Step 1: Create initial flow state with complete booking data
  console.log('\nStep 1: Creating initial flow state...');
  const initialData = {
    sport: 'badminton',
    date: '2025-06-03',
    duration: '2',
    time_slot: '10:00 AM-12:00 PM',
    name: 'Test User',
    phone: '1234567890',
    email: 'test@example.com',
    total_amount: '800',
    original_amount: '800',
    discount_info: '',
    bookingdetails: '📅 badminton - 2025-06-03\n⏰ 10:00 AM-12:00 PM\n⌛ Duration: 2 hour(s)',
    customerdetails: '👤 Test User\n📱 1234567890\n✉️ test@example.com',
    paymentdetails: '💰 Amount: ₹800'
  };
  
  await saveFlowState(testFlowToken, 'SUMMARY', initialData);
  console.log('✅ Initial flow state created');
  
  // Step 2: Verify flow state was saved correctly
  console.log('\nStep 2: Verifying flow state...');
  const flowState = await getFlowState(testFlowToken);
  console.log('Flow state retrieved:');
  console.log('- sport:', flowState.sport);
  console.log('- date:', flowState.date);
  console.log('- duration:', flowState.duration);
  console.log('- time_slot:', flowState.time_slot);
  console.log('- total_amount:', flowState.total_amount);
  
  // Step 3: Simulate the "Pay Now" button click with UPI payment method
  console.log('\nStep 3: Testing UPI payment flow by simulating "Pay Now" button click...');
  const upiPaymentData = {
    payment_method: 'upi',
    agree_terms: true,
    agree_cancellation: true,
    payment_requested: true,
    process_payment: true
  };
  
  try {
    console.log('Sending UPI payment request...');
    const upiResponse = await getNextScreen({
      flow_token: testFlowToken,
      screen: 'SUMMARY',
      data: upiPaymentData
    });
    
    console.log('UPI payment response:');
    console.log('- screen:', upiResponse.screen);
    
    if (upiResponse.screen === 'SUCCESS') {
      console.log('✅ Successfully created booking with UPI payment');
      console.log('- booking_id:', upiResponse.data.extension_message_response.params.booking_id);
      console.log('- upi_link:', upiResponse.data.upi_link);
    } else if (upiResponse.data.error_message) {
      console.log('❌ Error:', upiResponse.data.error_message);
    }
    
    // Step 4: Test Razorpay payment method
    console.log('\nStep 4: Testing Razorpay payment flow...');
    
    // Create a new flow token for Razorpay test
    const razorpayFlowToken = `test-razorpay-${Date.now()}`;
    await saveFlowState(razorpayFlowToken, 'SUMMARY', initialData);
    
    const razorpayPaymentData = {
      payment_method: 'razorpay',
      agree_terms: true,
      agree_cancellation: true,
      payment_requested: true,
      process_payment: true
    };
    
    console.log('Sending Razorpay payment request...');
    const razorpayResponse = await getNextScreen({
      flow_token: razorpayFlowToken,
      screen: 'SUMMARY',
      data: razorpayPaymentData
    });
    
    console.log('Razorpay payment response:');
    console.log('- screen:', razorpayResponse.screen);
    
    if (razorpayResponse.screen === 'SUCCESS') {
      console.log('✅ Successfully created booking with Razorpay payment');
      console.log('- booking_id:', razorpayResponse.data.extension_message_response.params.booking_id);
      console.log('- invoice_url:', razorpayResponse.data.invoice_url);
    } else if (razorpayResponse.data.error_message) {
      console.log('❌ Error:', razorpayResponse.data.error_message);
    }
    
  } catch (error) {
    console.error('❌ Error during payment flow test:', error);
  }
  
  console.log('\nTest completed!');
}

// Run the test
testPaymentFlow()
  .then(() => {
    console.log('Test script execution completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
  }); 