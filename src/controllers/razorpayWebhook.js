/**
 * Razorpay Webhook Controller for MySQL
 * Handles Razorpay webhook events
 */

const crypto = require('crypto');
const razorpayService = require('../services/razorpay.js');
const Booking = require('../models/mysql/Booking.js');
const FlowsState = require('../models/mysql/FlowsState.js');
const whatsappService = require('../services/whatsapp.js');

/**
 * Verify Razorpay webhook signature
 * @param {String} webhookBody - Raw webhook request body
 * @param {String} signature - Razorpay signature from headers
 * @returns {Boolean} - Whether signature is valid
 */
function verifyWebhookSignature(webhookBody, signature) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const generatedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(webhookBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

/**
 * Handle Razorpay webhook events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleWebhook(req, res) {
  try {
    // Get signature from headers
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify signature
    const isValidSignature = verifyWebhookSignature(req.rawBody, signature);
    if (!isValidSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Process webhook event
    const event = req.body;
    console.log(`Received Razorpay webhook: ${event.event}`);

    switch (event.event) {
      case 'payment.authorized':
        await handlePaymentAuthorized(event.payload.payment.entity);
        break;

      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;

      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity);
        break;

      case 'payment_link.paid':
        await handlePaymentLinkPaid(event.payload.payment_link.entity);
        break;

      default:
        console.log(`Unhandled Razorpay event: ${event.event}`);
    }

    // Acknowledge receipt of webhook
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Error handling Razorpay webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle payment authorized event
 * @param {Object} payment - Payment data from Razorpay
 */
async function handlePaymentAuthorized(payment) {
  try {
    console.log(`Payment authorized: ${payment.id} for order ${payment.order_id}`);
    
    // Process the successful payment
    await razorpayService.processSuccessfulPayment(payment);
    
    // Send WhatsApp notification
    await sendPaymentNotification(payment.order_id, 'success');
  } catch (error) {
    console.error('Error handling payment authorized:', error);
  }
}

/**
 * Handle payment captured event
 * @param {Object} payment - Payment data from Razorpay
 */
async function handlePaymentCaptured(payment) {
  try {
    console.log(`Payment captured: ${payment.id} for order ${payment.order_id}`);
    
    // Process the successful payment if not already processed
    await razorpayService.processSuccessfulPayment(payment);
    
    // Send WhatsApp notification if not already sent
    await sendPaymentNotification(payment.order_id, 'success');
  } catch (error) {
    console.error('Error handling payment captured:', error);
  }
}

/**
 * Handle payment failed event
 * @param {Object} payment - Payment data from Razorpay
 */
async function handlePaymentFailed(payment) {
  try {
    console.log(`Payment failed: ${payment.id} for order ${payment.order_id}`);
    
    // Process the failed payment
    await razorpayService.processFailedPayment(payment);
    
    // Send WhatsApp notification
    await sendPaymentNotification(payment.order_id, 'failed');
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

/**
 * Handle order paid event
 * @param {Object} order - Order data from Razorpay
 */
async function handleOrderPaid(order) {
  try {
    console.log(`Order paid: ${order.id}`);
    
    // Find the payment for this order
    const payment = await razorpayService.getPaymentByOrderId(order.id);
    if (payment) {
      // Process the successful payment
      await razorpayService.processSuccessfulPayment(payment);
      
      // Send WhatsApp notification
      await sendPaymentNotification(order.id, 'success');
    }
  } catch (error) {
    console.error('Error handling order paid:', error);
  }
}

/**
 * Handle payment link paid event
 * @param {Object} paymentLink - Payment link data from Razorpay
 */
async function handlePaymentLinkPaid(paymentLink) {
  try {
    console.log(`Payment link paid: ${paymentLink.id} for reference ${paymentLink.reference_id}`);
    
    // The reference_id is the order_id
    const orderId = paymentLink.reference_id;
    
    // Find the payment for this order
    const payment = await razorpayService.getPaymentByOrderId(orderId);
    if (payment) {
      // Process the successful payment
      await razorpayService.processSuccessfulPayment(payment);
      
      // Send WhatsApp notification
      await sendPaymentNotification(orderId, 'success');
    }
  } catch (error) {
    console.error('Error handling payment link paid:', error);
  }
}

/**
 * Send payment notification via WhatsApp
 * @param {String} orderId - Razorpay order ID
 * @param {String} status - Payment status (success, failed)
 */
async function sendPaymentNotification(orderId, status) {
  try {
    // Find booking by order ID
    const booking = await Booking.findOne({ 'payment.orderId': orderId });
    if (!booking) {
      console.log(`No booking found for order ID: ${orderId}`);
      return;
    }
    
    // Get customer phone number
    const customerPhone = booking.customerPhone;
    if (!customerPhone) {
      console.log(`No customer phone found for booking: ${booking._id}`);
      return;
    }
    
    // Get flow state if available
    let flowState = null;
    if (booking.flowToken) {
      flowState = await FlowsState.findOne({ flowToken: booking.flowToken });
    }
    
    // Determine which template to use based on status
    let templateName;
    let templateParams;
    
    if (status === 'success') {
      templateName = 'payment_success';
      templateParams = [
        { type: 'text', text: booking.customerName || 'Customer' },
        { type: 'text', text: booking.sport },
        { type: 'text', text: new Date(booking.date).toLocaleDateString() },
        { type: 'text', text: booking.time },
        { type: 'text', text: `${booking.duration} hour(s)` },
        { type: 'text', text: `₹${booking.amount}` },
        { type: 'text', text: booking._id }
      ];
    } else {
      templateName = 'payment_failed';
      templateParams = [
        { type: 'text', text: booking.customerName || 'Customer' },
        { type: 'text', text: booking.sport },
        { type: 'text', text: new Date(booking.date).toLocaleDateString() },
        { type: 'text', text: booking.time },
        { type: 'text', text: `${booking.duration} hour(s)` },
        { type: 'text', text: `₹${booking.amount}` }
      ];
    }
    
    // Send WhatsApp notification
    await whatsappService.sendTemplate(customerPhone, templateName, templateParams);
    
    console.log(`Sent ${status} payment notification to ${customerPhone} for booking ${booking._id}`);
  } catch (error) {
    console.error('Error sending payment notification:', error);
  }
}

module.exports = {
  handleWebhook
};