const express = require('express');
const WhatsAppWebhookController = require('../controllers/whatsapp/webhook');

const router = express.Router();

/**
 * WhatsApp Webhook Routes
 * Handles incoming webhook requests from WhatsApp
 */

// GET route for webhook verification
router.get('/', WhatsAppWebhookController.handleWebhook);

// POST route for webhook events
router.post('/', WhatsAppWebhookController.handleWebhook);

module.exports = router;