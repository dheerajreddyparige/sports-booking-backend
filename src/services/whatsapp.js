const axios = require('axios');
require('dotenv').config();

/**
 * WhatsApp Messaging Service
 * Handles sending messages and templates to WhatsApp
 */
class WhatsAppService {
  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v22.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  }

  /**
   * Sends a template message to a WhatsApp user
   * @param {string} to - Recipient's phone number
   * @param {string} templateName - Name of the template
   * @param {string} language - Language code (default: 'en_US')
   * @param {Array} components - Template components
   * @returns {Promise<Object>} - API response
   */
  async sendTemplate(to, templateName, language = 'en_US', components = []) {
    console.log(`🔄 Sending template '${templateName}' to ${to}`);
    
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: language
            },
            components
          }
        }
      });
      
      console.log('✅ Template sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending template:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Sends a text message to a WhatsApp user
   * @param {string} to - Recipient's phone number
   * @param {string} text - Message text
   * @returns {Promise<Object>} - API response
   */
  async sendTextMessage(to, text) {
    console.log(`🔄 Sending text message to ${to}`);
    
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: {
            body: text
          }
        }
      });
      
      console.log('✅ Text message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending text message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Sends an interactive message to a WhatsApp user
   * @param {string} to - Recipient's phone number
   * @param {Object} interactive - Interactive message object
   * @returns {Promise<Object>} - API response
   */
  async sendInteractiveMessage(to, interactive) {
    console.log(`🔄 Sending interactive message to ${to}`);
    
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'interactive',
          interactive
        }
      });
      
      console.log('✅ Interactive message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending interactive message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Marks a message as read
   * @param {string} messageId - ID of the message to mark as read
   * @returns {Promise<Object>} - API response
   */
  async markMessageAsRead(messageId) {
    console.log(`🔄 Marking message ${messageId} as read`);
    
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        }
      });
      
      console.log('✅ Message marked as read:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error marking message as read:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Sends a flow message to a WhatsApp user
   * @param {string} to - Recipient's phone number
   * @param {string} flowToken - Flow token
   * @param {string} flowId - Flow ID
   * @param {Object} flowData - Flow data
   * @returns {Promise<Object>} - API response
   */
  async sendFlowMessage(to, flowToken, flowId, flowData = {}) {
    console.log(`🔄 Sending flow message to ${to}`);
    
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'interactive',
          interactive: {
            type: 'flow',
            flow: {
              id: flowId,
              flow_token: flowToken,
              ...flowData
            }
          }
        }
      });
      
      console.log('✅ Flow message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending flow message:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new WhatsAppService();