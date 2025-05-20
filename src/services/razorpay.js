const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../config');

// Initialize Razorpay with API keys
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret
});

/**
 * Create a new payment order
 * @param {Object} orderData - Order data including amount, currency, receipt, etc.
 * @returns {Promise<Object>} - Razorpay order object
 */
async function createOrder(orderData) {
  try {
    console.log('💳 Creating Razorpay order:', orderData);
    
    // Create order with Razorpay
    const order = await razorpay.orders.create({
      amount: Math.round(orderData.amount * 100), // Amount in paise (multiply by 100)
      currency: orderData.currency || 'INR',
      receipt: orderData.receipt,
      notes: orderData.notes || {}
    });
    
    console.log('✅ Razorpay order created:', order.id);
    return order;
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    throw error;
  }
}

/**
 * Verify payment signature
 * @param {Object} paymentData - Payment data including orderId, paymentId, signature
 * @returns {boolean} - Whether signature is valid
 */
function verifyPaymentSignature(paymentData) {
  try {
    const { orderId, paymentId, signature } = paymentData;
    
    // Generate signature
    const text = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(text)
      .digest('hex');
    
    // Compare signatures
    return expectedSignature === signature;
  } catch (error) {
    console.error('❌ Error verifying payment signature:', error);
    return false;
  }
}

/**
 * Get payment details
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} - Payment details
 */
async function getPaymentDetails(paymentId) {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('❌ Error fetching payment details:', error);
    throw error;
  }
}

module.exports = {
  createOrder,
  verifyPaymentSignature,
  getPaymentDetails
};