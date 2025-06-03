/**
 * Test WhatsApp Payment Buttons
 * This script tests the WhatsApp payment buttons integration
 */
require('dotenv').config();
const axios = require('axios');

// WhatsApp API configuration
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v18.0';

// Payment configuration names
const RAZORPAY_CONFIG_NAME = "pitzone_razorpay";
const UPI_CONFIG_NAME = "PitZone_Upi";

// Test phone number (replace with your actual test number)
const TEST_PHONE = process.env.TEST_PHONE_NUMBER || '919876543210';

// Sample booking data
const sampleBooking = {
  booking_id: 'BK' + Date.now(),
  sport: 'badminton',
  date: new Date().toISOString().split('T')[0],
  time_slot: '17:00',
  total_amount: 800
};

/**
 * Send a message to WhatsApp API
 * @param {Object} message - Message object
 * @returns {Promise<Object>} - API response
 */
async function sendWhatsAppMessage(message) {
  try {
    console.log('Sending message to WhatsApp API...');
    
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
 * Create a payment button message
 * @param {string} to - Recipient's phone number
 * @param {Object} bookingData - Booking data
 * @returns {Object} - Payment button message
 */
function createPaymentButtonMessage(to, bookingData) {
  // Format amount properly
  const amount = parseInt(bookingData.total_amount) || 800;
  
  // Create a unique reference ID
  const referenceId = bookingData.booking_id || `BK${Date.now()}`;
  
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "order_details",
      header: {
        type: "text",
        text: "Payment Options"
      },
      body: {
        text: `Please complete your payment for ${bookingData.sport} booking on ${bookingData.date} at ${bookingData.time_slot}.`
      },
      footer: {
        text: "Secure payment options"
      },
      action: {
        name: "review_and_pay",
        parameters: {
          reference_id: referenceId,
          type: "digital-goods",
          payment_settings: [
            {
              type: "payment_gateway",
              payment_gateway: {
                type: "razorpay",
                configuration_name: RAZORPAY_CONFIG_NAME,
                razorpay: {
                  receipt: referenceId,
                  notes: {
                    sport: bookingData.sport || "badminton",
                    date: bookingData.date || new Date().toISOString().split('T')[0],
                    time_slot: bookingData.time_slot || "17:00",
                    customer_phone: to
                  }
                }
              }
            }
          ],
          currency: "INR",
          total_amount: {
            value: amount * 100, // Convert to paise (smallest unit)
            offset: 100
          },
          order: {
            status: "pending",
            items: [
              {
                name: `${bookingData.sport || 'Sports'} Booking`,
                amount: {
                  value: amount * 100,
                  offset: 100
                },
                quantity: 1
              }
            ],
            subtotal: {
              value: amount * 100,
              offset: 100
            },
            tax: {
              value: 0,
              offset: 100,
              description: "No tax"
            }
          }
        }
      }
    }
  };
}

/**
 * Test payment button message
 */
async function testPaymentButtonMessage() {
  try {
    console.log('Testing WhatsApp payment button message...');
    
    // Create payment button message
    const message = createPaymentButtonMessage(TEST_PHONE, sampleBooking);
    
    // Log the message
    console.log('Payment button message:', JSON.stringify(message, null, 2));
    
    // Send the message
    if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
      const response = await sendWhatsAppMessage(message);
      console.log('✅ Payment button message sent successfully!');
      console.log('Response:', response);
    } else {
      console.log('⚠️ Skipping actual message sending - WhatsApp credentials not set');
    }
  } catch (error) {
    console.error('❌ Error testing payment button message:', error);
  }
}

// Run the test
testPaymentButtonMessage().catch(console.error); 