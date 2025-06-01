/**
 * Razorpay Service for MySQL
 * Handles Razorpay payment operations
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/mysql/PaymentHistory.js');
const Booking = require('../models/mysql/Booking.js');
const Customer = require('../models/mysql/Customer.js');
const FlowsState = require('../models/mysql/FlowsState.js');

// Initialize Razorpay with API keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Payment timeout in milliseconds (15 minutes)
const PAYMENT_TIMEOUT = 15 * 60 * 1000;

/**
 * Create a Razorpay order
 * @param {Object} orderData - Order data including amount, currency, receipt, notes
 * @returns {Promise<Object>} - Created order
 */
async function createOrder(orderData) {
  try {
    const order = await razorpay.orders.create({
      amount: orderData.amount * 100, // Convert to paise
      currency: orderData.currency || 'INR',
      receipt: orderData.receipt,
      notes: orderData.notes || {}
    });

    // Store payment record in database
    await Payment.create({
      orderId: order.id,
      bookingId: orderData.bookingId,
      customerId: orderData.customerId,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      paymentMethod: 'razorpay',
      status: 'created',
      notes: orderData.notes ? JSON.stringify(orderData.notes) : null
    });

    // Update booking with order ID
    if (orderData.bookingId) {
      await Booking.findOneAndUpdate(
        { _id: orderData.bookingId },
        { $set: { 'payment.orderId': order.id } }
      );
    }

    // Update flow state if flowToken is provided
    if (orderData.flowToken) {
      await FlowsState.findOneAndUpdate(
        { flowToken: orderData.flowToken },
        { $set: { 'payment.orderId': order.id } }
      );
    }

    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
}

/**
 * Verify Razorpay payment signature
 * @param {Object} paymentData - Payment data including orderId, paymentId, signature
 * @returns {Boolean} - Whether signature is valid
 */
function verifyPaymentSignature(paymentData) {
  try {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${paymentData.orderId}|${paymentData.paymentId}`)
      .digest('hex');

    return generatedSignature === paymentData.signature;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
}

/**
 * Process successful payment
 * @param {Object} paymentData - Payment data from Razorpay
 * @returns {Promise<Object>} - Updated payment record
 */
async function processSuccessfulPayment(paymentData) {
  try {
    // Find payment by order ID
    const payment = await Payment.findOne({ orderId: paymentData.order_id });
    if (!payment) {
      throw new Error(`Payment not found for order ID: ${paymentData.order_id}`);
    }

    // Update payment record
    const updatedPayment = await Payment.findOneAndUpdate(
      { orderId: paymentData.order_id },
      {
        $set: {
          transactionId: paymentData.payment_id,
          status: 'completed',
          paymentDetails: paymentData
        }
      }
    );

    // Update booking status if associated with this payment
    if (updatedPayment.bookingId) {
      await Booking.findOneAndUpdate(
        { _id: updatedPayment.bookingId },
        {
          $set: {
            'payment.status': 'completed',
            'payment.transactionId': paymentData.payment_id,
            status: 'confirmed'
          }
        }
      );
    }

    // Update customer payment history
    if (updatedPayment.customerId) {
      await Customer.findOneAndUpdate(
        { customerId: updatedPayment.customerId },
        {
          $push: {
            paymentHistory: {
              amount: updatedPayment.amount,
              currency: updatedPayment.currency,
              paymentMethod: updatedPayment.paymentMethod,
              transactionId: updatedPayment.transactionId,
              status: 'completed',
              paymentDate: new Date()
            }
          }
        }
      );
    }

    // Update flow state if needed
    const booking = await Booking.findOne({ _id: updatedPayment.bookingId });
    if (booking && booking.flowToken) {
      await FlowsState.findOneAndUpdate(
        { flowToken: booking.flowToken },
        {
          $set: {
            'payment.status': 'completed',
            'payment.transactionId': paymentData.payment_id
          }
        }
      );
    }

    return updatedPayment;
  } catch (error) {
    console.error('Error processing successful payment:', error);
    throw error;
  }
}

/**
 * Process failed payment
 * @param {Object} paymentData - Payment data from Razorpay
 * @returns {Promise<Object>} - Updated payment record
 */
async function processFailedPayment(paymentData) {
  try {
    // Find payment by order ID
    const payment = await Payment.findOne({ orderId: paymentData.order_id });
    if (!payment) {
      throw new Error(`Payment not found for order ID: ${paymentData.order_id}`);
    }

    // Update payment record
    const updatedPayment = await Payment.findOneAndUpdate(
      { orderId: paymentData.order_id },
      {
        $set: {
          transactionId: paymentData.payment_id,
          status: 'failed',
          paymentDetails: paymentData
        }
      }
    );

    // Update booking status if associated with this payment
    if (updatedPayment.bookingId) {
      await Booking.findOneAndUpdate(
        { _id: updatedPayment.bookingId },
        {
          $set: {
            'payment.status': 'failed',
            'payment.transactionId': paymentData.payment_id,
            status: 'payment_failed'
          }
        }
      );
    }

    // Update flow state if needed
    const booking = await Booking.findOne({ _id: updatedPayment.bookingId });
    if (booking && booking.flowToken) {
      await FlowsState.findOneAndUpdate(
        { flowToken: booking.flowToken },
        {
          $set: {
            'payment.status': 'failed',
            'payment.transactionId': paymentData.payment_id
          }
        }
      );
    }

    return updatedPayment;
  } catch (error) {
    console.error('Error processing failed payment:', error);
    throw error;
  }
}

/**
 * Generate payment link for WhatsApp
 * @param {Object} paymentData - Payment data including orderId, amount, currency, description
 * @returns {Promise<String>} - Payment link URL
 */
async function generatePaymentLink(paymentData) {
  try {
    // Find payment by order ID
    const payment = await Payment.findOne({ orderId: paymentData.orderId });
    if (!payment) {
      throw new Error(`Payment not found for order ID: ${paymentData.orderId}`);
    }

    // Create payment link
    const paymentLink = await razorpay.paymentLink.create({
      amount: paymentData.amount * 100, // Convert to paise
      currency: paymentData.currency || 'INR',
      description: paymentData.description || 'Sports Booking Payment',
      reference_id: paymentData.orderId,
      customer: {
        name: paymentData.customerName,
        email: paymentData.customerEmail,
        contact: paymentData.customerPhone
      },
      notify: {
        sms: true,
        email: true,
        whatsapp: true
      },
      reminder_enable: true,
      notes: paymentData.notes || {},
      callback_url: paymentData.callbackUrl,
      callback_method: 'get'
    });

    // Update payment record with link ID
    await Payment.findOneAndUpdate(
      { orderId: paymentData.orderId },
      { $set: { 'paymentDetails.linkId': paymentLink.id } }
    );

    return paymentLink.short_url;
  } catch (error) {
    console.error('Error generating payment link:', error);
    throw error;
  }
}

module.exports = {
  createOrder,
  verifyPaymentSignature,
  processSuccessfulPayment,
  processFailedPayment,
  generatePaymentLink,
  PAYMENT_TIMEOUT
};