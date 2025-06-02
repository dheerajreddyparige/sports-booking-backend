/**
 * Razorpay Payment Service
 * Service for Razorpay payment integration
 */

const Razorpay = require('razorpay');

// Initialize Razorpay client
let razorpayClient = null;

/**
 * Get Razorpay client instance
 * @returns {Object} Razorpay client
 */
function getRazorpayClient() {
  if (!razorpayClient) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!key_id || !key_secret) {
      throw new Error('Razorpay API keys not found in environment variables');
    }
    
    razorpayClient = new Razorpay({
      key_id,
      key_secret
    });
  }
  
  return razorpayClient;
}

/**
 * Create a Razorpay order
 * @param {Object} options - Order options
 * @param {number} options.amount - Amount in smallest currency unit (paise for INR)
 * @param {string} options.currency - Currency code (default: INR)
 * @param {string} options.receipt - Receipt ID (booking ID)
 * @param {Object} options.notes - Additional notes
 * @returns {Promise<Object>} - Razorpay order object
 */
async function createRazorpayOrder(options) {
  try {
    const { amount, currency = 'INR', receipt, notes = {} } = options;
    
    // Convert amount to paise if not already (Razorpay expects amount in paise)
    const amountInPaise = Math.round(amount * 100);
    
    // Create order
    const orderOptions = {
      amount: amountInPaise,
      currency,
      receipt,
      notes
    };
    
    const client = getRazorpayClient();
    const order = await client.orders.create(orderOptions);
    
    console.log('Razorpay order created:', order);
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
}

/**
 * Verify Razorpay payment
 * @param {Object} options - Payment verification options
 * @param {string} options.razorpay_order_id - Razorpay order ID
 * @param {string} options.razorpay_payment_id - Razorpay payment ID
 * @param {string} options.razorpay_signature - Razorpay signature
 * @returns {boolean} - Whether payment is valid
 */
function verifyRazorpayPayment(options) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = options;
    
    // Get key secret from environment
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!key_secret) {
      throw new Error('Razorpay API key secret not found in environment variables');
    }
    
    // Import crypto
    const crypto = require('crypto');
    
    // Create hmac object
    const hmac = crypto.createHmac('sha256', key_secret);
    
    // Create the signature string
    const signatureData = razorpay_order_id + '|' + razorpay_payment_id;
    
    // Update hmac with data
    hmac.update(signatureData);
    
    // Get the generated signature
    const generatedSignature = hmac.digest('hex');
    
    // Compare signatures
    const isValid = generatedSignature === razorpay_signature;
    
    console.log('Razorpay payment verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    throw error;
  }
}

/**
 * Get Razorpay payment details
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} - Payment details
 */
async function getRazorpayPaymentDetails(paymentId) {
  try {
    const client = getRazorpayClient();
    const payment = await client.payments.fetch(paymentId);
    
    console.log('Razorpay payment details fetched:', payment);
    return payment;
  } catch (error) {
    console.error('Error fetching Razorpay payment details:', error);
    throw error;
  }
}

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getRazorpayPaymentDetails
}; 