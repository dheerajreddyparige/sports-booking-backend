/**
 * WhatsApp Message Service
 * Service for sending WhatsApp messages
 */

const axios = require('axios');

/**
 * Send a WhatsApp message using the WhatsApp Business API
 * @param {Object} messageData - Message data to be sent
 * @returns {Promise<Object>} - API response
 */
async function sendWhatsAppMessage(messageData) {
  try {
    // Get WhatsApp Business Account ID and token from environment variables
    const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '646511535207965';
    const token = process.env.WHATSAPP_API_TOKEN;
    
    if (!token) {
      throw new Error('WhatsApp API token not found in environment variables');
    }
    
    // Prepare headers and URL
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    const url = `https://graph.facebook.com/v18.0/${WABA_ID}/messages`;
    
    // Send message request
    const response = await axios.post(url, messageData, { headers });
    
    console.log('WhatsApp message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send a WhatsApp flow message
 * @param {string} to - Recipient's phone number
 * @param {string} flowId - WhatsApp Flow ID
 * @param {Object} data - Initial data for the flow
 * @returns {Promise<Object>} - API response
 */
async function sendWhatsAppFlow(to, flowId, data = {}) {
  try {
    const { createFlowMessage } = require('../../utils/whatsappPaymentFlow');
    
    // Create flow message
    const flowMessage = createFlowMessage(to, flowId, data);
    
    // Send message
    return await sendWhatsAppMessage(flowMessage);
  } catch (error) {
    console.error('Error sending WhatsApp flow:', error);
    throw error;
  }
}

module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppFlow
}; 