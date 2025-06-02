/**
 * Route for handling WhatsApp Flow completion
 */
router.post('/flow-completion', async (req, res) => {
  try {
    console.log('📥 Received flow completion webhook');
    
    // Get flow data from request body
    const flowData = req.body;
    
    // Handle flow completion using WhatsApp messaging service
    const whatsappMessaging = require('../../services/whatsappMessaging');
    const result = await whatsappMessaging.handleFlowCompletion(flowData);
    
    // Return result
    if (result.success) {
      console.log('✅ Flow completion processed successfully:', result);
      res.status(200).json({ success: true, message: 'Flow completion processed' });
    } else {
      console.error('❌ Error processing flow completion:', result.error);
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Error in flow completion webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Route for handling payment status webhook notifications
 */
router.post('/payment-status', async (req, res) => {
  try {
    console.log('📥 Received payment status webhook:', req.body);
    
    // Get payment data from request body
    const { payment_id, merchant_order_id, status, booking_ref } = req.body;
    
    // Import required modules
    const bookingService = require('../../services/bookingService');
    const whatsappMessaging = require('../../services/whatsappMessaging');
    
    // Find booking by order ID or booking reference
    let booking;
    if (merchant_order_id) {
      booking = await bookingService.getBookingByOrderId(merchant_order_id);
    } else if (booking_ref) {
      booking = await bookingService.getBookingById(booking_ref);
    }
    
    if (!booking) {
      console.error('❌ Booking not found for payment:', { merchant_order_id, booking_ref });
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    // Update booking status based on payment status
    if (status === 'success' || status === 'PAYMENT_SUCCESS') {
      await bookingService.updateBooking(booking.booking_id, {
        payment_status: 'completed',
        status: 'confirmed',
        payment_id: payment_id
      });
      
      // Send confirmation message to customer
      await whatsappMessaging.sendTextMessage(
        booking.customer_phone,
        `✅ Your payment for booking #${booking.booking_id} has been confirmed!\n\nDetails:\n- Sport: ${booking.sport}\n- Date: ${booking.booking_date}\n- Time: ${booking.time_slot}\n- Amount: ₹${booking.amount}\n\nThank you for booking with PitZone Sports!`
      );
    } else {
      // Payment failed or other status
      await bookingService.updateBooking(booking.booking_id, {
        payment_status: 'failed',
        status: 'payment_failed',
        payment_id: payment_id
      });
      
      // Send failure message to customer
      await whatsappMessaging.sendTextMessage(
        booking.customer_phone,
        `❌ Payment failed for booking #${booking.booking_id}.\n\nPlease try again or contact support for assistance.`
      );
    }
    
    res.status(200).json({ success: true, message: 'Payment status processed' });
  } catch (error) {
    console.error('❌ Error handling payment status webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}); 