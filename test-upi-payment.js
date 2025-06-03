/**
 * Test UPI Payment Intent
 * This script tests sending a UPI payment intent message via WhatsApp
 */
require('dotenv').config();
const whatsappService = require('./src/services/whatsapp');

async function testUpiPayment() {
  try {
    console.log('Testing UPI payment intent message...');
    
    // Test phone number (use your test number)
    const phoneNumber = process.env.TEST_PHONE_NUMBER || '918121627628';
    
    // Create a test booking data
    const bookingId = `UPI_TEST_${Date.now()}`;
    const bookingData = {
      id: bookingId,
      booking_id: bookingId,
      sport: 'badminton',
      date: new Date().toISOString().split('T')[0],
      start_time: '18:00',
      amount: 100, // ₹100
      customer_name: 'Test User'
    };
    
    // Generate UPI payment link
    // This is where you would normally use your UPI service
    // For testing, we'll create a dummy UPI link
    const upiIntent = generateTestUpiIntent(bookingData);
    console.log('Generated UPI Intent Link:', upiIntent);
    
    // Create UPI payment message following WhatsApp's API requirements
    const message = createUpiIntentMessage(phoneNumber, bookingData, upiIntent);
    console.log('UPI Payment Message:', JSON.stringify(message, null, 2));
    
    // Send the message
    console.log('Sending message to WhatsApp API...');
    const response = await whatsappService.sendRawMessage(message);
    console.log('Message sent successfully:', response);
    
    console.log('✅ UPI payment intent message sent successfully!');
    console.log('Response:', response);
    
    console.log(`
Next steps:
1. Check your WhatsApp for the UPI payment message
2. Test the UPI payment flow
3. Verify that the payment process works correctly
`);
  } catch (error) {
    console.error('❌ Error sending UPI payment message:', error);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
  }
}

/**
 * Generate a test UPI intent link
 * In a real scenario, this would come from your payment gateway
 * @param {Object} bookingData - Booking data
 * @returns {string} - UPI intent link
 */
function generateTestUpiIntent(bookingData) {
  const params = {
    pa: 'pitzone@ybl', // Your UPI VPA (Payment Address)
    pn: 'PitZone Sports', // Payee Name
    tr: bookingData.booking_id, // Transaction Reference ID - must match reference_id
    am: bookingData.amount.toFixed(2), // Amount
    cu: 'INR', // Currency
    mc: '5411', // Merchant Category Code - required parameter
    purpose: '00' // Purpose Code - required parameter for UPI intent
  };
  
  const queryParams = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  return `upi://pay?${queryParams}`;
}

/**
 * Create a UPI intent payment message
 * @param {string} to - Phone number to send message to
 * @param {Object} bookingData - Booking data
 * @param {string} upiLink - UPI payment link
 * @returns {Object} - Message object
 */
function createUpiIntentMessage(to, bookingData, upiLink) {
  const referenceId = String(bookingData.booking_id);
  
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "order_details",
      header: {
        type: "text",
        text: "UPI Intent Payment"
      },
      body: {
        text: `Please complete your payment for ${bookingData.sport} booking on ${bookingData.date} at ${bookingData.start_time}. Tap Pay to proceed with UPI payment.`
      },
      footer: {
        text: `Booking ID: ${referenceId}`
      },
      action: {
        name: "review_and_pay",
        parameters: {
          reference_id: referenceId,
          type: "digital-goods",
          payment_settings: [
            {
              type: "upi_intent_link",
              upi_intent_link: {
                link: upiLink
              }
            }
          ],
          currency: "INR",
          total_amount: {
            value: (bookingData.amount || 0) * 100,
            offset: 100
          },
          order: {
            status: "pending",
            items: [
              {
                name: `${bookingData.sport} Court Booking`,
                amount: {
                  value: (bookingData.amount || 0) * 100,
                  offset: 100
                },
                quantity: 1
              }
            ],
            subtotal: {
              value: (bookingData.amount || 0) * 100,
              offset: 100
            },
            tax: {
              value: 0,
              offset: 100
            }
          }
        }
      }
    }
  };
}

// Run the test
testUpiPayment().catch(console.error); 