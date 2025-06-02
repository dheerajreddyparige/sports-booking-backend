/**
 * Main application entry point
 * MySQL version
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectToDatabase = require('./utils/mysql-connection');
const WhatsAppFlowsController = require('./controllers/whatsapp/flows');
// Import routes
const availableSlotsRoutes = require('./api/available-slots.js');
const bookingRoutes = require('./api/bookings.js');
const sportsRoutes = require('./api/sports.js');
const webhookRoutes = require('./api/webhook.js');
const razorpayWebhookRoutes = require('./api/razorpayWebhook.js');
const apiRoutes = require('./api/routes/index.js');

// Create Express app
const app = express();

// Middleware
app.use(cors());

// Parse JSON bodies
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    // Save raw body for signature verification
    if (req.url.includes('/api/razorpay-webhook')) {
      req.rawBody = buf.toString();
    }
  }
}));

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
  res.send('Sports Booking API - MySQL Version');
});

// Configure routes
app.use('/api/available-slots', availableSlotsRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/razorpay-webhook', razorpayWebhookRoutes);
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
app.post("/", WhatsAppFlowsController.handleFlowRequest);
// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize database connection
    const pool = await connectToDatabase();
    console.log('Connected to MySQL database');
    
    // Test the connection
    const [rows] = await pool.query('SELECT 1 as test');
    console.log('Database connection test:', rows[0].test === 1 ? 'Successful' : 'Failed');
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
}

// Start the server
startServer();