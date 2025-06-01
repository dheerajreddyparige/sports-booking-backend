/**
 * MySQL Razorpay Utilities
 * Provides functions for Razorpay payment integration with MySQL database
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../config');
const { Booking, Customer, PaymentHistory } = require('../models/mysql');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret
});

/**
 * Create a Razorpay order for a booking
 * @param {Object} booking - Booking object
 * @param {Object} customer - Customer object
 * @returns {Promise<Object>} Razorpay order object
 */
async function createOrder(booking, customer) {
  try {
    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: booking.amount * 100, // Amount in paise
      currency: 'INR',
      receipt: booking.bookingId,
      notes: {
        bookingId: booking.bookingId,
        sport: booking.sport,
        date: booking.date,
        time: booking.startTime,
        duration: booking.duration,
        customerName: customer.firstName + ' ' + customer.lastName,
        customerPhone: customer.phoneNumber
      }
    });
    
    // Update booking with payment ID
    await Booking.update(booking.id, {
      paymentId: order.id,
      paymentStatus: 'created'
    });
    
    // Create payment history record
    await PaymentHistory.create({
      paymentId: order.id,
      customerId: customer.id,
      bookingId: booking.id,
      amount: booking.amount,
      currency: 'INR',
      status: 'created',
      paymentMethod: null, // Will be updated when payment is completed
      metadata: {
        razorpayOrderId: order.id,
        notes: order.notes
      }
    });
    
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
}

/**
 * Generate payment link for a booking
 * @param {Object} booking - Booking object
 * @param {Object} customer - Customer object
 * @returns {Promise<Object>} Payment link object
 */
async function generatePaymentLink(booking, customer) {
  try {
    // Create payment link
    const paymentLink = await razorpay.paymentLink.create({
      amount: booking.amount * 100, // Amount in paise
      currency: 'INR',
      accept_partial: false,
      description: `Payment for ${booking.sport} booking on ${booking.date} at ${booking.startTime}`,
      customer: {
        name: customer.firstName + ' ' + customer.lastName,
        email: customer.email,
        contact: customer.phoneNumber
      },
      notify: {
        sms: true,
        email: true,
        whatsapp: true
      },
      reminder_enable: true,
      notes: {
        bookingId: booking.bookingId,
        sport: booking.sport,
        date: booking.date,
        time: booking.startTime,
        duration: booking.duration
      },
      callback_url: `${config.serverUrl}/api/razorpay-callback?bookingId=${booking.bookingId}`,
      callback_method: 'get'
    });
    
    // Update booking with payment ID
    await Booking.update(booking.id, {
      paymentId: paymentLink.id,
      paymentStatus: 'created'
    });
    
    // Create payment history record
    await PaymentHistory.create({
      paymentId: paymentLink.id,
      customerId: customer.id,
      bookingId: booking.id,
      amount: booking.amount,
      currency: 'INR',
      status: 'created',
      paymentMethod: null, // Will be updated when payment is completed
      metadata: {
        razorpayPaymentLinkId: paymentLink.id,
        shortUrl: paymentLink.short_url,
        notes: paymentLink.notes
      }
    });
    
    return paymentLink;
  } catch (error) {
    console.error('Error generating payment link:', error);
    throw error;
  }
}

/**
 * Verify Razorpay webhook signature
 * @param {string} body - Request body as string
 * @param {string} signature - Razorpay signature from headers
 * @returns {boolean} True if signature is valid
 */
function verifyWebhookSignature(body, signature) {
  try {
    return razorpay.webhooks.verifySignature(body, signature, config.razorpay.webhookSecret);
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Process payment success
 * @param {Object} paymentData - Payment data from Razorpay
 * @returns {Promise<Object>} Updated booking
 */
async function processPaymentSuccess(paymentData) {
  try {
    const { order_id, payment_id, payment_link_id } = paymentData;
    const paymentId = order_id || payment_link_id;
    
    if (!paymentId) {
      throw new Error('Payment ID not found in webhook data');
    }
    
    // Find booking by payment ID
    const booking = await Booking.findOne({ paymentId });
    
    if (!booking) {
      throw new Error(`Booking not found for payment ID: ${paymentId}`);
    }
    
    // Update booking status
    const updatedBooking = await Booking.update(booking.id, {
      status: 'confirmed',
      paymentStatus: 'paid'
    });
    
    // Update payment history
    await PaymentHistory.update(
      { paymentId },
      {
        status: 'paid',
        paymentMethod: paymentData.payment_method || 'unknown',
        metadata: {
          ...paymentData,
          razorpayPaymentId: payment_id
        }
      }
    );
    
    return updatedBooking;
  } catch (error) {
    console.error('Error processing payment success:', error);
    throw error;
  }
}

/**
 * Process payment failure
 * @param {Object} paymentData - Payment data from Razorpay
 * @returns {Promise<Object>} Updated booking
 */
async function processPaymentFailure(paymentData) {
  try {
    const { order_id, payment_id, payment_link_id } = paymentData;
    const paymentId = order_id || payment_link_id;
    
    if (!paymentId) {
      throw new Error('Payment ID not found in webhook data');
    }
    
    // Find booking by payment ID
    const booking = await Booking.findOne({ paymentId });
    
    if (!booking) {
      throw new Error(`Booking not found for payment ID: ${paymentId}`);
    }
    
    // Update booking status
    const updatedBooking = await Booking.update(booking.id, {
      status: 'payment_failed',
      paymentStatus: 'failed'
    });
    
    // Update payment history
    await PaymentHistory.update(
      { paymentId },
      {
        status: 'failed',
        paymentMethod: paymentData.payment_method || 'unknown',
        metadata: {
          ...paymentData,
          razorpayPaymentId: payment_id,
          error: paymentData.error || 'Unknown error'
        }
      }
    );
    
    return updatedBooking;
  } catch (error) {
    console.error('Error processing payment failure:', error);
    throw error;
  }
}

module.exports = {
  createOrder,
  generatePaymentLink,
  verifyWebhookSignature,
  processPaymentSuccess,
  processPaymentFailure
};