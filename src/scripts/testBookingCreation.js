/**
 * Test Booking Creation Script
 * This script tests the booking creation process and payment link generation
 */

const dotenv = require('dotenv');
const { createBooking, updateBooking, generateUpiPaymentLink } = require('../utils/flowDbUtils');

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' }); // Try to load from .env.local as well

/**
 * Test booking creation and payment link generation
 */
async function testBookingCreation() {
  console.log('Testing booking creation and payment link generation...');
  
  // Sample booking data based on the provided flow state
  const bookingData = {
    sport: 'badminton',
    date: '2025-06-02',
    duration: 2,
    time_slot: '5:00 AM-7:00 AM',
    customer_name: 'Dheeraj Reddy Parige',
    customer_phone: '0899499534',
    customer_email: 'pdheerajreddy13@gmail.com',
    amount: '760',
    status: 'pending'
  };
  
  try {
    // Step 1: Create a booking
    console.log('\nStep 1: Creating booking...');
    const bookingId = await createBooking(bookingData);
    console.log('✅ Booking created with ID:', bookingId);
    
    // Step 2: Generate UPI payment link
    console.log('\nStep 2: Generating UPI payment link...');
    
    // Add booking ID to the data
    const paymentData = {
      ...bookingData,
      bookingId
    };
    
    // Use the helper function to generate UPI link
    const upiLink = generateUpiPaymentLink(paymentData);
    console.log('✅ UPI payment link generated:', upiLink);
    
    // Step 3: Update booking with UPI link
    console.log('\nStep 3: Updating booking with UPI link...');
    await updateBooking(bookingId, {
      upi_link: upiLink,
      payment_method: 'upi'
    });
    console.log('✅ Booking updated with UPI link');
    
    // Step 4: Generate Razorpay invoice URL (mock)
    console.log('\nStep 4: Generating Razorpay invoice URL (mock)...');
    const invoiceUrl = `https://rzp.io/i/example/${bookingId}`;
    console.log('✅ Razorpay invoice URL generated:', invoiceUrl);
    
    // Final response that would be sent to WhatsApp
    console.log('\nFinal response that would be sent to WhatsApp:');
    const successResponse = {
      screen: "SUCCESS",
      data: {
        upi_link: upiLink,
        invoice_url: invoiceUrl,
        cancellation_policy: "100% refund: Cancel >2 hours before booking.\n75% refund: Cancel 1-2 hours before.\nNo refund: Cancel <1 hour before.",
        extension_message_response: {
          params: {
            flow_token: "flows-builder-68946cd8",
            booking_id: bookingId
          }
        }
      }
    };
    
    console.log(JSON.stringify(successResponse, null, 2));
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testBookingCreation()
  .then(() => {
    console.log('\nTest completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 