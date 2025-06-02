/**
 * Handle WhatsApp Flow Completion
 * This controller handles the flow completion webhook and initiates payment process
 */

const { createPaymentOptionsMessage, createUpiPaymentMessage, createRazorpayPaymentMessage } = require('../../../utils/whatsappPaymentFlow');
const { generateUpiLink } = require('../../../services/payments/upiService');
const { createRazorpayOrder } = require('../../../services/payments/razorpayService');
const { sendWhatsAppMessage } = require('../../../services/whatsapp/messageService');
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
    await sendWhatsAppMessage(paymentOptionsMessage);
    
    res.status(200).json({ success: true, message: 'Flow completion processed' });
  } catch (error) {
    console.error('Error handling flow completion:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Process UPI payment request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function processUpiPayment(req, res) {
  try {
    const { to, booking_id } = req.body;
    
    // Get booking details
    const booking = await bookingService.getBookingById(booking_id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    // Generate UPI link
    const upiLink = await generateUpiLink({
      amount: booking.total_amount,
      bookingId: booking.booking_id,
      customerName: booking.name
    });
    
    // Update booking with UPI link
    await bookingService.updateBooking(booking_id, { upi_link: upiLink });
    
    // Send UPI payment message
    const upiPaymentMessage = createUpiPaymentMessage(to, booking, upiLink);
    await sendWhatsAppMessage(upiPaymentMessage);
    
    res.status(200).json({ success: true, message: 'UPI payment initiated' });
  } catch (error) {
    console.error('Error processing UPI payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Process Razorpay payment request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function processRazorpayPayment(req, res) {
  try {
    const { to, booking_id } = req.body;
    
    // Get booking details
    const booking = await bookingService.getBookingById(booking_id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    // Create Razorpay order
    const orderData = await createRazorpayOrder({
      amount: booking.total_amount,
      currency: 'INR',
      receipt: booking.booking_id,
      notes: {
        booking_id: booking.booking_id,
        customer_name: booking.name,
        customer_email: booking.email,
        customer_phone: booking.phone
      }
    });
    
    // Update booking with Razorpay order ID
    await bookingService.updateBooking(booking_id, { 
      razorpay_order_id: orderData.id
    });
    
    // Send Razorpay payment message
    const razorpayPaymentMessage = createRazorpayPaymentMessage(to, booking, orderData.id);
    await sendWhatsAppMessage(razorpayPaymentMessage);
    
    res.status(200).json({ success: true, message: 'Razorpay payment initiated' });
  } catch (error) {
    console.error('Error processing Razorpay payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Handle payment status update
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handlePaymentStatus(req, res) {
  try {
    const { payment_id, merchant_order_id, status } = req.body;
    
    // Find booking by Razorpay order ID
    const booking = await bookingService.getBookingByOrderId(merchant_order_id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    // Update booking status based on payment status
    if (status === 'success') {
      await bookingService.updateBooking(booking.booking_id, {
        payment_status: 'completed',
        status: 'confirmed',
        payment_id: payment_id
      });
      
      // Send confirmation message (you can implement this separately)
      // await sendPaymentConfirmation(booking.phone, booking);
    } else {
      await bookingService.updateBooking(booking.booking_id, {
        payment_status: status,
        payment_id: payment_id
      });
    }
    
    res.status(200).json({ success: true, message: 'Payment status updated' });
  } catch (error) {
    console.error('Error handling payment status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  handleFlowCompletion,
  processUpiPayment,
  processRazorpayPayment,
  handlePaymentStatus
}; 