/**
 * Handle WhatsApp Flow Completion
 * This controller handles the flow completion webhook and initiates payment process
 */

const { createPaymentOptionsMessage, createUpiPaymentMessage, createRazorpayPaymentMessage } = require('../../../utils/whatsappPaymentFlow');
const { generateUpiLink } = require('../../../services/payments/upiService');
const { createRazorpayOrder } = require('../../../services/payments/razorpayService');
const whatsappService = require('../../../services/whatsapp');
const bookingService = require('../../../services/bookingService');

/**
 * Handle flow completion webhook
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleFlowCompletion(req, res) {
  try {
    const { to, payload, flow_token } = req.body;
    
    // Log flow completion
    console.log('Flow completed with token:', flow_token);
    console.log('Flow payload:', payload);
    
    // Create a temporary booking in the database
    const bookingData = {
      sport: payload.sport,
      date: payload.date,
      time_slot: payload.time_slot,
      duration: payload.duration,
      total_amount: payload.total_amount,
      name: payload.name,
      email: payload.email,
      phone: to,
      payment_method: payload.payment_method,
      booking_id: 'BK' + Date.now(),
      status: 'pending',
      payment_status: 'pending',
      flow_token: flow_token
    };
    
    // Save temporary booking
    const booking = await bookingService.createTemporaryBooking(bookingData);
    
    // Send payment options message
    const paymentOptionsMessage = createPaymentOptionsMessage(to, bookingData);
    await whatsappService.sendRawMessage(paymentOptionsMessage);
    
    res.status(200).json({ success: true, message: 'Flow completion processed' });
  } catch (error) {
    console.error('Error handling flow completion:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Process UPI payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function processUpiPayment(req, res) {
  try {
    const { to, booking_id } = req.body;
    
    // Get booking details
    const booking = await bookingService.getBookingById(booking_id);
    
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    // Generate UPI payment link
    const upiLink = generateUpiLink(booking);
    
    // Create UPI payment message
    const upiPaymentMessage = createUpiPaymentMessage(to, booking, upiLink);
    
    // Send UPI payment message
    await whatsappService.sendRawMessage(upiPaymentMessage);
    
    res.status(200).json({ success: true, message: 'UPI payment initiated' });
  } catch (error) {
    console.error('Error processing UPI payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Process Razorpay payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function processRazorpayPayment(req, res) {
  try {
    const { to, booking_id } = req.body;
    
    // Get booking details
    const booking = await bookingService.getBookingById(booking_id);
    
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    // Create Razorpay order
    const order = await createRazorpayOrder(booking);
    
    // Create Razorpay payment message
    const razorpayPaymentMessage = createRazorpayPaymentMessage(to, booking, order.id);
    
    // Send Razorpay payment message
    await whatsappService.sendRawMessage(razorpayPaymentMessage);
    
    // Update booking with order ID
    await bookingService.updateBooking(booking_id, { razorpay_order_id: order.id });
    
    res.status(200).json({ success: true, message: 'Razorpay payment initiated' });
  } catch (error) {
    console.error('Error processing Razorpay payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Handle payment webhook from payment gateway
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handlePaymentWebhook(req, res) {
  try {
    const { event, payload } = req.body;
    
    console.log('Received payment webhook:', event);
    console.log('Webhook payload:', payload);
    
    // Verify webhook signature if available
    // This should be implemented based on your payment gateway's requirements
    
    // Process different webhook events
    switch (event) {
      case 'payment.authorized':
      case 'payment.captured':
        await processSuccessfulPayment(payload);
        break;
      case 'payment.failed':
        await processFailedPayment(payload);
        break;
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }
    
    // Always return 200 to acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling payment webhook:', error);
    
    // Still return 200 to prevent retries
    res.status(200).json({ success: false, error: error.message });
  }
}

/**
 * Process successful payment
 * @param {Object} payload - Payment payload
 */
async function processSuccessfulPayment(payload) {
  try {
    // Extract booking ID from payload
    const { order_id, reference_id, booking_id } = payload;
    const bookingId = booking_id || reference_id;
    
    if (!bookingId) {
      throw new Error('No booking ID found in payload');
    }
    
    // Update booking status
    await bookingService.confirmBooking(bookingId, {
      payment_status: 'paid',
      transaction_id: payload.payment_id || payload.transaction_id,
      payment_method: payload.payment_method || 'online'
    });
    
    // Get booking details
    const booking = await bookingService.getBookingById(bookingId);
    
    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }
    
    // Send confirmation message to customer
    const confirmationMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: booking.phone,
      type: "interactive",
      interactive: {
        type: "order_status",
        body: {
          text: `Your payment for ${booking.sport} booking on ${booking.date} at ${booking.start_time} has been confirmed. Thank you for your booking!`
        },
        action: {
          name: "review_order",
          parameters: {
            reference_id: bookingId,
            order: {
              status: "completed",
              description: "Payment received and booking confirmed"
            }
          }
        }
      }
    };
    
    await whatsappService.sendRawMessage(confirmationMessage);
  } catch (error) {
    console.error('Error processing successful payment:', error);
    throw error;
  }
}

/**
 * Process failed payment
 * @param {Object} payload - Payment payload
 */
async function processFailedPayment(payload) {
  try {
    // Extract booking ID from payload
    const { order_id, reference_id, booking_id } = payload;
    const bookingId = booking_id || reference_id;
    
    if (!bookingId) {
      throw new Error('No booking ID found in payload');
    }
    
    // Update booking status
    await bookingService.updateBooking(bookingId, {
      payment_status: 'failed',
      transaction_id: payload.payment_id || payload.transaction_id,
      payment_method: payload.payment_method || 'online'
    });
    
    // Get booking details
    const booking = await bookingService.getBookingById(bookingId);
    
    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }
    
    // Send failure message to customer
    const failureMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: booking.phone,
      type: "interactive",
      interactive: {
        type: "order_status",
        body: {
          text: `Your payment for ${booking.sport} booking on ${booking.date} at ${booking.start_time} has failed. Please try again or contact support.`
        },
        action: {
          name: "review_order",
          parameters: {
            reference_id: bookingId,
            order: {
              status: "pending",
              description: "Payment failed, please try again"
            }
          }
        }
      }
    };
    
    await whatsappService.sendRawMessage(failureMessage);
  } catch (error) {
    console.error('Error processing failed payment:', error);
    throw error;
  }
}

module.exports = {
  handleFlowCompletion,
  processUpiPayment,
  processRazorpayPayment,
  handlePaymentWebhook
}; 