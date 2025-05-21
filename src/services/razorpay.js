const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../config');

// Initialize Razorpay with API keys
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret
});

// Payment timeout in milliseconds (5 minutes)
const PAYMENT_TIMEOUT = 5 * 60 * 1000;

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
 * Verify webhook signature from Razorpay
 * @param {Object} webhookData - Webhook data including body and signature
 * @returns {boolean} - Whether signature is valid
 */
function verifyWebhookSignature(webhookData) {
  try {
    const { body, signature, secret } = webhookData;
    
    // Use provided secret or fall back to key secret
    const webhookSecret = secret || config.razorpay.keySecret;
    
    // Generate signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');
    
    // Compare signatures
    return expectedSignature === signature;
  } catch (error) {
    console.error('❌ Error verifying webhook signature:', error);
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

/**
 * Capture an authorized payment
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Amount to capture (in paise)
 * @returns {Promise<Object>} - Capture response
 */
async function capturePayment(paymentId, amount) {
  try {
    console.log(`💳 Capturing payment ${paymentId} for amount ${amount}`);
    const payment = await razorpay.payments.capture(paymentId, amount);
    console.log('✅ Payment captured successfully:', payment.id);
    return payment;
  } catch (error) {
    console.error('❌ Error capturing payment:', error);
    throw error;
  }
}

/**
 * Refund a payment
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Amount to refund (in paise)
 * @returns {Promise<Object>} - Refund response
 */
async function refundPayment(paymentId, amount) {
  try {
    console.log(`💳 Refunding payment ${paymentId} for amount ${amount}`);
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount
    });
    console.log('✅ Payment refunded successfully:', refund.id);
    return refund;
  } catch (error) {
    console.error('❌ Error refunding payment:', error);
    throw error;
  }
}

/**
 * Set a timeout for payment completion
 * @param {string} bookingId - Booking ID
 * @param {string} orderId - Razorpay order ID
 * @returns {Object} - Timeout object that can be cleared
 */
function setPaymentTimeout(bookingId, orderId) {
  console.log(`⏱️ Setting ${PAYMENT_TIMEOUT/1000} second timeout for booking ${bookingId}`);
  
  const timeoutId = setTimeout(async () => {
    try {
      // Import models here to avoid circular dependencies
      const Booking = require('../models/Booking');
      const FlowsState = require('../models/FlowsState');
      
      // Check if booking exists and payment is still pending
      const booking = await Booking.findById(bookingId);
      
      if (booking && booking.paymentStatus === 'pending') {
        console.log(`⏱️ Payment timeout for booking ${bookingId}. Cancelling booking.`);
        
        // Update booking status
        booking.status = 'cancelled';
        booking.notes = booking.notes ? `${booking.notes}\nCancelled due to payment timeout.` : 'Cancelled due to payment timeout.';
        await booking.save();
        
        // Get user's flow state
        const flowState = await FlowsState.findOne({ bookingId: bookingId });
        
        if (flowState) {
          // Send timeout message via WhatsApp
          const whatsappService = require('./whatsapp');
          await whatsappService.sendTextMessage(
            flowState.phoneNumber,
            'Your booking has been cancelled because the payment was not completed within 5 minutes. Please start a new booking if you still want to book a slot.'
          );
        }
      }
    } catch (error) {
      console.error('❌ Error handling payment timeout:', error);
    }
  }, PAYMENT_TIMEOUT);
  
  return { timeoutId };
}

/**
 * Clear payment timeout
 * @param {Object} timeout - Timeout object returned by setPaymentTimeout
 */
function clearPaymentTimeout(timeout) {
  if (timeout && timeout.timeoutId) {
    clearTimeout(timeout.timeoutId);
    console.log('⏱️ Payment timeout cleared');
  }
}

module.exports = {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  getPaymentDetails,
  capturePayment,
  refundPayment,
  setPaymentTimeout,
  clearPaymentTimeout,
  PAYMENT_TIMEOUT
};