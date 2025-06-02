/**
 * API Routes Index
 * Register all API routes
 */

const express = require('express');
const router = express.Router();

// Import routes
const whatsappFlowRoutes = require('./whatsappFlowRoutes');

// Register routes
router.use('/whatsapp/flows', whatsappFlowRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 