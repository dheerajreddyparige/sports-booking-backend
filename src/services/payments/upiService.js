/**
 * UPI Payment Service
 * Handles UPI payment link generation and verification
 */

/**
 * Generate a UPI payment link
 * @param {Object} bookingData - Booking data
 * @returns {string} - UPI payment link
 */
function generateUpiLink(bookingData) {
  try {
    console.log('Generating UPI link for booking:', bookingData);
    
    // Get UPI configuration from environment variables
    const merchantVpa = process.env.UPI_MERCHANT_VPA || 'yourmerchant@ybl';
    const merchantName = process.env.UPI_MERCHANT_NAME || 'PitZone Sports';
    
    // Format amount properly (ensure it's a number)
    const amount = parseFloat(bookingData.total_amount || 800).toFixed(2);
    
    // Create a unique transaction reference ID
    const transactionRef = bookingData.booking_id || `BK${Date.now()}`;
    
    // Create UPI payment link
    const upiLink = `upi://pay?pa=${encodeURIComponent(merchantVpa)}`
      + `&pn=${encodeURIComponent(merchantName)}`
      + `&tr=${encodeURIComponent(transactionRef)}`
      + `&am=${encodeURIComponent(amount)}`
      + `&cu=INR`
      + `&tn=${encodeURIComponent(`Sports booking for ${bookingData.sport} on ${bookingData.date} at ${bookingData.time_slot}`)}`
      + `&mc=5399`  // Merchant Category Code for Sports and Recreation
      + `&mode=00`  // Default mode
      + `&purpose=00`; // Default purpose code
    
    console.log('UPI link generated successfully:', upiLink);
    return upiLink;
  } catch (error) {
    console.error('Error generating UPI link:', error);
    throw new Error(`Failed to generate UPI link: ${error.message}`);
  }
}

/**
 * Extract transaction reference from UPI link
 * @param {string} upiLink - UPI payment link
 * @returns {string|null} - Transaction reference or null if not found
 */
function extractTransactionReference(upiLink) {
  try {
    if (!upiLink) return null;
    
    // Extract tr parameter from UPI link
    const trMatch = upiLink.match(/tr=([^&]+)/);
    if (trMatch && trMatch[1]) {
      return decodeURIComponent(trMatch[1]);
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting transaction reference:', error);
    return null;
  }
}

/**
 * Verify UPI transaction status
 * Note: This is a placeholder function. In a real implementation, 
 * you would need to integrate with your payment gateway's API
 * to verify the transaction status.
 * 
 * @param {string} transactionRef - Transaction reference
 * @returns {Promise<Object>} - Transaction status
 */
async function verifyUpiTransaction(transactionRef) {
  try {
    console.log('Verifying UPI transaction:', transactionRef);
    
    // This is where you would integrate with your payment gateway's API
    // to check the status of the UPI transaction
    
    // For now, we'll return a mock successful response
    return {
      transactionRef,
      status: 'success',
      amount: '800.00',
      currency: 'INR',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error verifying UPI transaction:', error);
    throw new Error(`Failed to verify UPI transaction: ${error.message}`);
  }
}

module.exports = {
  generateUpiLink,
  extractTransactionReference,
  verifyUpiTransaction
}; 