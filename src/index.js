const express = require('express');
const cors = require('cors');
const connectToDatabase = require('./utils/connect-to-database');
const WhatsAppFlowsController = require('./controllers/whatsapp/flows');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());

// Apply express.json middleware with rawBody storage for signature validation
app.use(
  express.json({
    verify: (req, res, buf, encoding) => {
      req.rawBody = buf?.toString(encoding || "utf8");
    },
  }),
);

const { APP_SECRET, PRIVATE_KEY, PASSPHRASE = "", PORT = "3000" } = process.env;

app.post("/", WhatsAppFlowsController.handleFlowRequest);

app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});

// Initialize MongoDB connection
connectToDatabase()
  .then(() => console.log('MongoDB connection ready'))
  .catch(err => console.error('MongoDB connection failed:', err));

// Routes
app.use('/api/health', require('../src/api/health'));
app.use('/api/available-slots', require('../src/api/available-slots'));
app.use('/api/bookings', require('../src/api/bookings'));
app.use('/api/sports', require('../src/api/sports'));
app.use('/api/webhook', require('../src/api/webhook')); // WhatsApp webhook endpoint


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

function isRequestSignatureValid(req) {
  if (!APP_SECRET) {
    console.warn("App Secret is not set up. Please Add your app secret in /.env file to check for request validation");
    return true; // Assuming no signature validation in absence of secret
  }

  const signatureHeader = req.get("x-hub-signature-256");
  const signatureBuffer = Buffer.from(signatureHeader.replace("sha256=", ""), "utf-8");

  const hmac = crypto.createHmac("sha256", APP_SECRET);
  const digestString = hmac.update(req.rawBody).digest('hex');
  const digestBuffer = Buffer.from(digestString, "utf-8");

  if (!crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
    console.error("Error: Request Signature did not match");
    return false;
  }
  return true;
}

module.exports = app;
