/**
 * UPI Payment Service
 * Service for generating UPI payment links
 */

/**
 * Generate UPI payment link
 * @param {Object} options - Payment options
 * @param {number} options.amount - Payment amount
 * @param {string} options.bookingId - Booking ID for reference
 * @param {string} options.customerName - Customer name
 * @returns {Promise<string>} - UPI payment link
 */
async function generateUpiLink(options) {
  try {
    const { amount, bookingId, customerName } = options;
    
    // UPI merchant VPA from environment variable or use default
    const merchantVPA = process.env.UPI_MERCHANT_VPA || 'pitzone@ybl';
    
    // Merchant name from environment variable or use default
    const merchantName = process.env.UPI_MERCHANT_NAME || 'PitZone Sports';
    
    // Create UPI link with standard format
    // Format: upi://pay?pa=MERCHANT_VPA&pn=MERCHANT_NAME&tr=REFERENCE_ID&am=AMOUNT&cu=CURRENCY&tn=TRANSACTION_NOTE
    const upiLink = `upi://pay?pa=${encodeURIComponent(merchantVPA)}&pn=${encodeURIComponent(merchantName)}&tr=${encodeURIComponent(bookingId)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Booking for ${customerName}`)}`;
    
    console.log('Generated UPI link:', upiLink);
    return upiLink;
  } catch (error) {
    console.error('Error generating UPI link:', error);
    throw error;
  }
}

/**
 * Validate UPI payment status
 * @param {string} referenceId - Reference ID (booking ID)
 * @returns {Promise<Object>} - Payment status
 */
async function validateUpiPayment(referenceId) {
  try {
    // In a real implementation, this would make an API call to a UPI payment gateway
    // For now, we'll simulate a successful payment
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return simulated payment status
    return {
      referenceId,
      status: 'success',
      timestamp: new Date().toISOString(),
      paymentId: 'UPI' + Date.now(),
      message: 'Payment successful'
    };
  } catch (error) {
    console.error('Error validating UPI payment:', error);
    throw error;
  }
}

module.exports = {
  generateUpiLink,
  validateUpiPayment
}; 