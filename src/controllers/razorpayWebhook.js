/**
 * Razorpay Webhook Controller
 * Handles payment callbacks from Razorpay
 */

const razorpayService = require('../services/razorpay');
const Booking = require('../models/Booking');
const FlowsState = require('../models/FlowsState');
const whatsappService = require('../services/whatsapp');
const whatsappMessageTemplates = require('../utils/whatsappMessageTemplates');

/**
 * Process Razorpay webhook events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleWebhook(req, res) {
  try {
    console.log('🔄 Received Razorpay webhook:', req.body);
    
    // Verify webhook signature
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      console.error('❌ Missing Razorpay signature');
      return res.status(400).json({ error: 'Missing signature' });
    }
    
    // Get config with Razorpay credentials
    const config = require('../config');
    
    // Verify the webhook payload
    const isValid = razorpayService.verifyWebhookSignature({
      body: JSON.stringify(req.body),
      signature,
      secret: config.razorpay.webhookSecret || config.razorpay.keySecret
    });
    
    if (!isValid) {
      console.error('❌ Invalid Razorpay signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    // Process different event types
    const event = req.body.event;
    
    switch (event) {
      case 'payment.authorized':
        await handlePaymentAuthorized(req.body.payload.payment.entity);
        break;
      case 'payment.captured':
        await handlePaymentCaptured(req.body.payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(req.body.payload.payment.entity);
        break;
      default:
        console.log(`ℹ️ Unhandled Razorpay event: ${event}`);
    }
    
    // Acknowledge receipt of webhook
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Error processing Razorpay webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle payment authorized event
 * @param {Object} payment - Payment entity from Razorpay
 */
async function handlePaymentAuthorized(payment) {
  try {
    console.log('💳 Payment authorized:', payment.id);
    
    // Get order ID from payment
    const orderId = payment.order_id;
    
    // Find booking with this transaction ID
    const booking = await Booking.findOne({ transactionId: orderId });
    
    if (!booking) {
      console.error(`❌ No booking found for order ID: ${orderId}`);
      return;
    }
    
    // Update booking status
    booking.paymentStatus = 'pending';
    booking.notes = booking.notes ? `${booking.notes}\nPayment authorized: ${payment.id}` : `Payment authorized: ${payment.id}`;
    await booking.save();
    
    console.log(`✅ Booking ${booking._id} updated with authorized payment`);
  } catch (error) {
    console.error('❌ Error handling payment authorized:', error);
  }
}

/**
 * Handle payment captured event
 * @param {Object} payment - Payment entity from Razorpay
 */
async function handlePaymentCaptured(payment) {
  try {
    console.log('💳 Payment captured:', payment.id);
    
    // Get order ID from payment
    const orderId = payment.order_id;
    
    // Find booking with this transaction ID
    const booking = await Booking.findOne({ transactionId: orderId });
    
    if (!booking) {
      console.error(`❌ No booking found for order ID: ${orderId}`);
      return;
    }
    
    // Update booking status
    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    booking.paymentCompletedAt = new Date();
    booking.notes = booking.notes ? `${booking.notes}\nPayment captured: ${payment.id}` : `Payment captured: ${payment.id}`;
    await booking.save();
    
    // Clear payment timeout
    razorpayService.clearPaymentTimeout({ timeoutId: booking._id.toString() });
    
    // Get flow state for this booking
    const flowState = await FlowsState.findOne({ bookingId: booking._id.toString() });
    
    if (flowState) {
      // Get booking details for confirmation message
      const bookingDate = new Date(booking.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
      
      // Format time
      const formatTime = (time) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours, 10);
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${period}`;
      };
      
      const startTimeFormatted = formatTime(booking.startTime);
      const endTimeFormatted = formatTime(booking.endTime);
      const timeSlot = `${startTimeFormatted} - ${endTimeFormatted}`;
      
      // Format booking details for confirmation message
      const bookingDetails = {
        bookingId: booking._id.toString(),
        phoneNumber: booking.customerPhone,
        sport: booking.sport.charAt(0).toUpperCase() + booking.sport.slice(1),
        date: bookingDate,
        time: timeSlot,
        duration: booking.duration,
        court: `${booking.sport.charAt(0).toUpperCase() + booking.sport.slice(1)} Court`,
        baseRate: booking.amount,
        totalPrice: booking.amount
      };
      
      // Send success message
      const successTemplate = whatsappMessageTemplates.createPaymentStatusTemplate(
        booking.customerPhone,
        'success',
        bookingDetails
      );
      
      await whatsappService.sendRawMessage(successTemplate);
      
      // Send booking confirmation
      const confirmationTemplate = whatsappMessageTemplates.createBookingConfirmationTemplate(bookingDetails);
      await whatsappService.sendRawMessage(confirmationTemplate);
    }
    
    console.log(`✅ Booking ${booking._id} confirmed with payment ${payment.id}`);
  } catch (error) {
    console.error('❌ Error handling payment captured:', error);
  }
}

/**
 * Handle payment failed event
 * @param {Object} payment - Payment entity from Razorpay
 */
async function handlePaymentFailed(payment) {
  try {
    console.log('💳 Payment failed:', payment.id);
    
    // Get order ID from payment
    const orderId = payment.order_id;
    
    // Find booking with this transaction ID
    const booking = await Booking.findOne({ transactionId: orderId });
    
    if (!booking) {
      console.error(`❌ No booking found for order ID: ${orderId}`);
      return;
    }
    
    // Update booking status
    booking.paymentStatus = 'failed';
    booking.notes = booking.notes ? `${booking.notes}\nPayment failed: ${payment.id}` : `Payment failed: ${payment.id}`;
    await booking.save();
    
    // Get flow state for this booking
    const flowState = await FlowsState.findOne({ bookingId: booking._id.toString() });
    
    if (flowState) {
      // Get booking details for failure message
      const bookingDate = new Date(booking.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
      
      // Format time
      const formatTime = (time) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours, 10);
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${period}`;
      };
      
      const startTimeFormatted = formatTime(booking.startTime);
      const endTimeFormatted = formatTime(booking.endTime);
      const timeSlot = `${startTimeFormatted} - ${endTimeFormatted}`;
      
      // Format booking details for failure message
      const bookingDetails = {
        bookingId: booking._id.toString(),
        phoneNumber: booking.customerPhone,
        sport: booking.sport.charAt(0).toUpperCase() + booking.sport.slice(1),
        date: bookingDate,
        time: timeSlot,
        duration: booking.duration,
        court: `${booking.sport.charAt(0).toUpperCase() + booking.sport.slice(1)} Court`,
        totalPrice: booking.amount
      };
      
      // Send failure message
      const failureTemplate = whatsappMessageTemplates.createPaymentStatusTemplate(
        booking.customerPhone,
        'failed',
        bookingDetails
      );
      
      await whatsappService.sendRawMessage(failureTemplate);
      
      // Send booking options again
      await whatsappService.sendTextMessage(
        booking.customerPhone,
        'You can try booking again or choose a different payment method.'
      );
    }
    
    console.log(`✅ Booking ${booking._id} marked as failed payment ${payment.id}`);
  } catch (error) {
    console.error('❌ Error handling payment failed:', error);
  }
}

module.exports = {
  handleWebhook
};