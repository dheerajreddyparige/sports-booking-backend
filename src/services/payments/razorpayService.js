/**
 * Razorpay Payment Service
 * Handles Razorpay payment gateway integration
 */

const axios = require('axios');
const crypto = require('crypto');

// Razorpay API credentials
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_API_URL = 'https://api.razorpay.com/v1';

/**
 * Create a Razorpay order
 * @param {Object} bookingData - Booking data
 * @returns {Promise<Object>} - Razorpay order object
 */
async function createRazorpayOrder(bookingData) {
  try {
    console.log('Creating Razorpay order for booking:', bookingData);
    
    // Format amount properly (ensure it's a number and convert to paise)
    const amount = parseInt(bookingData.total_amount || 800) * 100;
    
    // Create a unique receipt ID
    const receipt = bookingData.booking_id || `BK${Date.now()}`;
    
    // Create order payload
    const orderPayload = {
      amount: amount,
      currency: 'INR',
      receipt: receipt,
      notes: {
        booking_id: bookingData.booking_id,
        sport: bookingData.sport || 'badminton',
        date: bookingData.date || new Date().toISOString().split('T')[0],
        time_slot: bookingData.time_slot || '17:00',
        customer_phone: bookingData.phone
      }
    };
    
    // Make API request to create order
    const response = await axios.post(
      `${RAZORPAY_API_URL}/orders`,
      orderPayload,
      {
        auth: {
          username: RAZORPAY_KEY_ID,
          password: RAZORPAY_KEY_SECRET
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Razorpay order created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating Razorpay order:', error.response?.data || error.message);
    throw new Error(`Failed to create Razorpay order: ${error.message}`);
  }
}

/**
 * Verify Razorpay payment signature
 * @param {Object} paymentData - Payment data from webhook
 * @returns {boolean} - Whether the signature is valid
 */
function verifyPaymentSignature(paymentData) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
    
    // Create signature verification string
    const signatureString = `${razorpay_order_id}|${razorpay_payment_id}`;
    
    // Generate HMAC SHA256 hash
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(signatureString)
      .digest('hex');
    
    // Compare signatures
    return expectedSignature === razorpay_signature;
  } catch (error) {
    console.error('Error verifying Razorpay signature:', error);
    return false;
  }
}

/**
 * Fetch payment details from Razorpay
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} - Payment details
 */
async function fetchPaymentDetails(paymentId) {
  try {
    const response = await axios.get(
      `${RAZORPAY_API_URL}/payments/${paymentId}`,
      {
        auth: {
          username: RAZORPAY_KEY_ID,
          password: RAZORPAY_KEY_SECRET
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching Razorpay payment details:', error.response?.data || error.message);
    throw new Error(`Failed to fetch payment details: ${error.message}`);
  }
}

/**
 * Process a refund for a payment
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Amount to refund (in paise)
 * @returns {Promise<Object>} - Refund details
 */
async function processRefund(paymentId, amount) {
  try {
    const response = await axios.post(
      `${RAZORPAY_API_URL}/payments/${paymentId}/refund`,
      { amount },
      {
        auth: {
          username: RAZORPAY_KEY_ID,
          password: RAZORPAY_KEY_SECRET
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error processing Razorpay refund:', error.response?.data || error.message);
    throw new Error(`Failed to process refund: ${error.message}`);
  }
}

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  fetchPaymentDetails,
  processRefund
}; 