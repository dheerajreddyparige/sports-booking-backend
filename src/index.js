const express = require('express');
const cors = require('cors');
const connectToDatabase = require('./util/connect-to-database');
const { decryptRequest, encryptResponse, FlowEndpointException } = require('./util/encryption'); // Import your decryption methods
const { getNextScreen } = require('./util/flow'); // Import your flow methods
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

app.post("/", async (req, res) => {
  if (!PRIVATE_KEY) {
    throw new Error('Private key is empty. Please check your env variable "PRIVATE_KEY".');
  }

  if (!isRequestSignatureValid(req)) {
    return res.status(432).send();
  }

  let decryptedRequest = null;
  try {
    decryptedRequest = decryptRequest(req.body, PRIVATE_KEY, PASSPHRASE);
  } catch (err) {
    console.error(err);
    if (err instanceof FlowEndpointException) {
      return res.status(err.statusCode).send();
    }
    return res.status(500).send();
  }

  const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;
  console.log("💬 Decrypted Request:", decryptedBody);

  const screenResponse = await getNextScreen(decryptedBody);
  console.log("👉 Response to Encrypt:", screenResponse);

  res.send(encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer));
});

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
