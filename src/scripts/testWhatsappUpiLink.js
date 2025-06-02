/**
 * Test WhatsApp UPI Link Script
 * This script tests the UPI payment link generation according to WhatsApp Cloud API requirements
 */

const dotenv = require('dotenv');
const { generateUpiPaymentLink } = require('../utils/flowDbUtils');

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' }); // Try to load from .env.local as well

/**
 * Test WhatsApp UPI payment link generation
 */
async function testWhatsappUpiLink() {
  console.log('Testing WhatsApp UPI payment link generation...');
  
  // Sample booking data
  const bookingData = {
    bookingId: 'BK123456789',
    sport: 'badminton',
    date: '2025-06-02',
    duration: 2,
    time_slot: '5:00 AM-7:00 AM',
    customer_name: 'Dheeraj Reddy Parige',
    customer_phone: '0899499534',
    customer_email: 'pdheerajreddy13@gmail.com',
    amount: '760'
  };
  
  try {
    // Generate UPI payment link
    console.log('\nGenerating UPI payment link...');
    const upiLink = generateUpiPaymentLink(bookingData);
    console.log('✅ UPI payment link generated:', upiLink);
    
    // Parse and validate the UPI link
    console.log('\nValidating UPI link components:');
    const url = new URL(upiLink.replace('upi://', 'https://'));
    const params = url.searchParams;
    
    // Check required parameters according to NPCI and WhatsApp requirements
    const requiredParams = ['pa', 'pn', 'tr', 'am', 'cu'];
    const recommendedParams = ['mc', 'purpose', 'tn'];
    
    console.log('\nRequired parameters:');
    requiredParams.forEach(param => {
      const value = params.get(param);
      console.log(`- ${param}: ${value || 'MISSING'} ${value ? '✅' : '❌'}`);
    });
    
    console.log('\nRecommended parameters:');
    recommendedParams.forEach(param => {
      const value = params.get(param);
      console.log(`- ${param}: ${value || 'MISSING'} ${value ? '✅' : '⚠️'}`);
    });
    
    // Verify format for WhatsApp Cloud API
    console.log('\nVerifying format for WhatsApp Cloud API:');
    
    // Check if all required parameters are present
    const isValid = requiredParams.every(param => params.get(param));
    
    if (isValid) {
      console.log('✅ UPI link format is valid for WhatsApp Cloud API');
      
      // Generate WhatsApp order_details interactive message example
      console.log('\nExample WhatsApp order_details message with UPI link:');
      const orderDetailsMessage = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": bookingData.customer_phone,
        "type": "interactive",
        "interactive": {
          "type": "order_details",
          "header": {
            "type": "text",
            "text": "Booking Confirmation"
          },
          "body": {
            "text": `Thank you for booking ${bookingData.sport} on ${bookingData.date} at ${bookingData.time_slot}. Please complete your payment to confirm your booking.`
          },
          "footer": {
            "text": "PitZone Sports"
          },
          "action": {
            "name": "review_and_pay",
            "parameters": {
              "reference_id": bookingData.bookingId,
              "type": "digital-goods",
              "payment_settings": [
                {
                  "type": "upi_intent_link",
                  "upi_intent_link": {
                    "link": upiLink
                  }
                }
              ],
              "currency": "INR",
              "total_amount": {
                "value": parseInt(parseFloat(bookingData.amount) * 100),
                "offset": 100
              },
              "order": {
                "status": "pending",
                "items": [
                  {
                    "name": `${bookingData.sport} - ${bookingData.time_slot}`,
                    "amount": {
                      "value": parseInt(parseFloat(bookingData.amount) * 100),
                      "offset": 100
                    },
                    "quantity": 1
                  }
                ],
                "subtotal": {
                  "value": parseInt(parseFloat(bookingData.amount) * 100),
                  "offset": 100
                }
              }
            }
          }
        }
      };
      
      console.log(JSON.stringify(orderDetailsMessage, null, 2));
    } else {
      console.log('❌ UPI link is missing required parameters');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testWhatsappUpiLink()
  .then(() => {
    console.log('\nTest completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 