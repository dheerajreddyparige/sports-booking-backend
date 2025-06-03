/**
 * Test WhatsApp Payment Integration
 * Tests both UPI and Razorpay payment message generation
 */
require('dotenv').config();

const { createPaymentOptionsMessage, createUpiPaymentMessage, createRazorpayPaymentMessage } = require('./src/utils/whatsappPaymentFlow');
const { generateUpiLink } = require('./src/services/payments/upiService');
const { createRazorpayOrder } = require('./src/services/payments/razorpayService');
const axios = require('axios');

// WhatsApp API credentials
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v18.0';

// Test phone number (replace with your actual test number)
const TEST_PHONE = process.env.TEST_PHONE_NUMBER || '919876543210';

// Sample booking data
const sampleBooking = {
  booking_id: 'BK' + Date.now(),
  sport: 'badminton',
  date: new Date().toISOString().split('T')[0],
  time_slot: '17:00',
  total_amount: 800,
  name: 'Test User',
  email: 'test@example.com',
  phone: TEST_PHONE
};

/**
 * Send a message to WhatsApp API
 * @param {Object} message - Message object
 * @returns {Promise<Object>} - API response
 */
async function sendWhatsAppMessage(message) {
  try {
    console.log('Sending message to WhatsApp API:', JSON.stringify(message, null, 2));

    const response = await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      message,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Test payment options message
 */
async function testPaymentOptionsMessage() {
  console.log('\n--- Testing Payment Options Message ---');
  
  try {
    const message = createPaymentOptionsMessage(TEST_PHONE, sampleBooking);
    console.log('Generated Payment Options Message:');
    console.log(JSON.stringify(message, null, 2));

    // Uncomment to actually send the message
    // await sendWhatsAppMessage(message);
    
    console.log('✅ Payment options message test completed');
  } catch (error) {
    console.error('❌ Payment options message test failed:', error);
  }
}

/**
 * Test UPI payment message
 */
async function testUpiPaymentMessage() {
  console.log('\n--- Testing UPI Payment Message ---');
  
  try {
    // Generate UPI link
    const upiLink = generateUpiLink(sampleBooking);
    console.log('Generated UPI link:', upiLink);
    
    // Create UPI payment message
    const message = createUpiPaymentMessage(TEST_PHONE, sampleBooking, upiLink);
    console.log('Generated UPI Payment Message:');
    console.log(JSON.stringify(message, null, 2));

    // Uncomment to actually send the message
    // await sendWhatsAppMessage(message);
    
    console.log('✅ UPI payment message test completed');
  } catch (error) {
    console.error('❌ UPI payment message test failed:', error);
  }
}

/**
 * Test Razorpay payment message
 */
async function testRazorpayPaymentMessage() {
  console.log('\n--- Testing Razorpay Payment Message ---');
  
  try {
    // Skip actual Razorpay API call if credentials are not set
    let orderId = 'order_' + Date.now();
    
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      // Create Razorpay order
      console.log('Creating Razorpay order...');
      const order = await createRazorpayOrder(sampleBooking);
      orderId = order.id;
      console.log('Razorpay order created:', orderId);
    } else {
      console.log('⚠️ Razorpay credentials not set, using mock order ID');
    }
    
    // Create Razorpay payment message
    const message = createRazorpayPaymentMessage(TEST_PHONE, sampleBooking, orderId);
    console.log('Generated Razorpay Payment Message:');
    console.log(JSON.stringify(message, null, 2));

    // Uncomment to actually send the message
    // await sendWhatsAppMessage(message);
    
    console.log('✅ Razorpay payment message test completed');
  } catch (error) {
    console.error('❌ Razorpay payment message test failed:', error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Starting WhatsApp Payment Integration Tests');
  
  await testPaymentOptionsMessage();
  await testUpiPaymentMessage();
  await testRazorpayPaymentMessage();
  
  console.log('\n🏁 All tests completed');
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
}); 