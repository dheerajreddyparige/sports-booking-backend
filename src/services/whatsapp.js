/**
 * WhatsApp Service for MySQL
 * Handles WhatsApp messaging operations
 */

const axios = require('axios');
const Customer = require('../models/mysql/Customer.js');
const FlowsState = require('../models/mysql/FlowsState.js');

class WhatsAppService {
  constructor() {
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v23.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
  }

  /**
   * Send a WhatsApp message
   * @param {String} to - Recipient phone number with country code
   * @param {Object} message - Message object
   * @returns {Promise<Object>} - API response
   */
  async sendMessage(to, message) {
    try {
      const formattedTo = this.formatPhoneNumber(to);
      
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: message.type,
          [message.type]: message.content
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update customer's last active timestamp
      await this.updateCustomerActivity(formattedTo);

      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a text message
   * @param {String} to - Recipient phone number with country code
   * @param {String} text - Message text
   * @returns {Promise<Object>} - API response
   */
  async sendTextMessage(to, text) {
    return this.sendMessage(to, {
      type: 'text',
      content: {
        preview_url: true,
        body: text
      }
    });
  }

  /**
   * Send a raw message payload directly to WhatsApp API
   * @param {Object} payload - Complete message payload
   * @returns {Promise<Object>} - API response
   */
  async sendRawMessage(payload) {
    try {
      console.log('📤 Sending raw message payload:', JSON.stringify(payload));
      
      // Format the recipient phone number if it exists in the payload
      if (payload.to) {
        payload.to = this.formatPhoneNumber(payload.to);
      }
      
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update customer's last active timestamp if we have the phone number
      if (payload.to) {
        await this.updateCustomerActivity(payload.to);
      }

      console.log('✅ Raw message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending raw WhatsApp message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a template message
   * @param {String} to - Recipient phone number with country code
   * @param {String} templateName - Name of the template
   * @param {Array} components - Template components
   * @returns {Promise<Object>} - API response
   */
  async sendTemplate(to, templateName, components = []) {
    try {
      const formattedTo = this.formatPhoneNumber(to);
      
      // Construct template components
      const templateComponents = [];
      
      if (components.length > 0) {
        templateComponents.push({
          type: 'body',
          parameters: components
        });
      }

      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'en_US'
            },
            components: templateComponents
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update customer's last active timestamp
      await this.updateCustomerActivity(formattedTo);

      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp template:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send an interactive list message
   * @param {String} to - Recipient phone number with country code
   * @param {String} headerText - Header text
   * @param {String} bodyText - Body text
   * @param {String} footerText - Footer text
   * @param {String} buttonText - Button text
   * @param {Array} sections - List sections
   * @returns {Promise<Object>} - API response
   */
  async sendListMessage(to, headerText, bodyText, footerText, buttonText, sections) {
    try {
      const formattedTo = this.formatPhoneNumber(to);
      
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'interactive',
          interactive: {
            type: 'list',
            header: {
              type: 'text',
              text: headerText
            },
            body: {
              text: bodyText
            },
            footer: {
              text: footerText
            },
            action: {
              button: buttonText,
              sections: sections
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update customer's last active timestamp
      await this.updateCustomerActivity(formattedTo);

      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp list message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a button message
   * @param {String} to - Recipient phone number with country code
   * @param {String} headerText - Header text
   * @param {String} bodyText - Body text
   * @param {String} footerText - Footer text
   * @param {Array} buttons - Buttons
   * @returns {Promise<Object>} - API response
   */
  async sendButtonMessage(to, headerText, bodyText, footerText, buttons) {
    try {
      const formattedTo = this.formatPhoneNumber(to);
      
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'interactive',
          interactive: {
            type: 'button',
            header: headerText ? {
              type: 'text',
              text: headerText
            } : undefined,
            body: {
              text: bodyText
            },
            footer: footerText ? {
              text: footerText
            } : undefined,
            action: {
              buttons: buttons
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update customer's last active timestamp
      await this.updateCustomerActivity(formattedTo);

      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp button message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Start a WhatsApp Flow
   * @param {String} to - Recipient phone number with country code
   * @param {String} flowToken - Flow token
   * @param {String} flowId - Flow ID
   * @param {Object} flowData - Flow data
   * @returns {Promise<Object>} - API response
   */
  async startFlow(to, flowToken, flowId, flowData = {}) {
    try {
      const formattedTo = this.formatPhoneNumber(to);
      
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'flows',
          flows: {
            flow_token: flowToken,
            flow_id: flowId,
            flow_cta: 'Book Now',
            flow_action: 'navigate',
            flow_data: flowData
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Create or update flow state
      await FlowsState.findOneAndUpdate(
        { flowToken },
        {
          $set: {
            flowToken,
            phoneNumber: formattedTo,
            screen: 'initial',
            processedMessages: []
          }
        },
        { upsert: true }
      );

      // Update customer's last active timestamp
      await this.updateCustomerActivity(formattedTo);

      return response.data;
    } catch (error) {
      console.error('Error starting WhatsApp flow:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Format phone number to ensure it has country code
   * @param {String} phoneNumber - Phone number
   * @returns {String} - Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Ensure it has country code (default to India +91)
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    } else if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }
    
    return cleaned;
  }

  /**
   * Update customer's last active timestamp
   * @param {String} phoneNumber - Customer's phone number
   */
  async updateCustomerActivity(phoneNumber) {
    try {
      // Find customer by phone number
      const customer = await Customer.findOne({ phone: phoneNumber });
      
      if (customer) {
        // Update last active timestamp and increment login count
        await Customer.findOneAndUpdate(
          { _id: customer._id },
          {
            $set: {
              lastActive: new Date(),
              lastLogin: new Date()
            },
            $inc: { loginCount: 1 }
          }
        );
      } else {
        // Create new customer record
        await Customer.create({
          phone: phoneNumber,
          customerId: `CUST${Date.now()}`,
          lastActive: new Date(),
          lastLogin: new Date(),
          loginCount: 1,
          accountStatus: 'active',
          verification: {
            phone: true
          }
        });
      }
    } catch (error) {
      console.error('Error updating customer activity:', error);
      // Don't throw error to prevent message sending failure
    }
  }
}

module.exports = new WhatsAppService();