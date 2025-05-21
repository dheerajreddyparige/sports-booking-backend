/**
 * Razorpay Webhook Routes
 */

const express = require('express');
const router = express.Router();
const razorpayWebhookController = require('../controllers/razorpayWebhook');

// Razorpay webhook endpoint
router.post('/webhook', razorpayWebhookController.handleWebhook);

module.exports = router;