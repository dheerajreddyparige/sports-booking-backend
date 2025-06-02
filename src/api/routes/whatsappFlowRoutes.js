/**
 * WhatsApp Flow Routes
 * Routes for WhatsApp Flow completion and payment processes
 */

const express = require('express');
const router = express.Router();
const flowController = require('../../controllers/whatsapp/payments/handleFlowCompletion');

// Route to handle flow completion webhook
router.post('/flow-completion', flowController.handleFlowCompletion);

// Routes for payment processing
router.post('/payment/upi', flowController.processUpiPayment);
router.post('/payment/razorpay', flowController.processRazorpayPayment);
router.post('/payment/status', flowController.handlePaymentStatus);

// Route to send a WhatsApp flow message to a user
router.post('/send-flow', async (req, res) => {
  try {
    const { to, flowId, data } = req.body;
    
    if (!to || !flowId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: to and flowId' 
      });
    }
    
    // Import here to avoid circular dependencies
    const { createFlowMessage } = require('../../utils/whatsappPaymentFlow');
    const { sendWhatsAppMessage } = require('../../services/whatsapp/messageService');
    
    // Create and send flow message
    const flowMessage = createFlowMessage(to, flowId, data || {});
    const response = await sendWhatsAppMessage(flowMessage);
    
    res.status(200).json({ 
      success: true, 
      message: 'Flow message sent successfully',
      response 
    });
  } catch (error) {
    console.error('Error sending flow message:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router; 