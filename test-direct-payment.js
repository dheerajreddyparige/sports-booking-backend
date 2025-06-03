/**
 * Test script for sending a direct payment message via WhatsApp
 */
require('dotenv').config();
const whatsappService = require('./src/services/whatsapp');

/**
 * Send a direct payment message for testing
 */
async function testDirectPayment() {
  try {
    console.log('Testing direct payment message...');
    
    // Test phone number
    const phoneNumber = process.env.TEST_PHONE_NUMBER || '918121627628';
    
    // Create a test booking with all fields as strings
    const bookingId = `RZP_TEST_${Date.now()}`;
    const bookingData = {
      id: bookingId,
      booking_id: bookingId,
      sport: 'badminton',
      date: new Date().toISOString().split('T')[0],
      start_time: '18:00',
      amount: 100,
      customer_name: 'Test User'
    };
    
    // Create the payment message
    const paymentMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
      type: "interactive",
      interactive: {
        type: "order_details",
        header: {
          type: "text", 
          text: "Payment for Court Booking"
        },
        body: {
          text: `Please complete your payment for ${bookingData.sport} booking on ${bookingData.date} at ${bookingData.start_time}.`
        },
        footer: {
          text: `Booking ID: ${bookingId}`
        },
        action: {
          name: "review_and_pay",
          parameters: {
            reference_id: String(bookingId),
            type: "digital-goods",
            payment_settings: [
              {
                type: "payment_gateway",
                payment_gateway: {
                  type: "razorpay",
                  configuration_name: "pitzone_razorpay",
                  razorpay: {
                    receipt: String(bookingId),
                    notes: {
                      booking_id: String(bookingId),
                      sport: bookingData.sport
                    }
                  }
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
                  retailer_id: String(bookingId),
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
    
    console.log('Payment Message:', JSON.stringify(paymentMessage, null, 2));
    
    // Send the message
    console.log('Sending message to WhatsApp API...');
    const response = await whatsappService.sendRawMessage(paymentMessage);
    console.log('✅ Message sent successfully with ID:', response.messages[0].id);
    
    return response;
  } catch (error) {
    console.error('❌ Error sending direct payment message:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
testDirectPayment().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
}); 