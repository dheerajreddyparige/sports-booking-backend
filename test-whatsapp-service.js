/**
 * Test WhatsApp Service
 */
require('dotenv').config();
const whatsappService = require('./src/services/whatsapp');

async function testWhatsAppService() {
  try {
    console.log('Testing WhatsApp service...');
    
    // Check if sendRawMessage exists
    console.log('sendRawMessage exists:', typeof whatsappService.sendRawMessage === 'function');
    
    // Create a test message
    const testMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '919876543210', // Replace with your test number
      type: 'text',
      text: {
        body: 'This is a test message from the WhatsApp service'
      }
    };
    
    // Try to send the message
    console.log('Attempting to send a test message...');
    try {
      const result = await whatsappService.sendRawMessage(testMessage);
      console.log('Message sent successfully:', result);
    } catch (sendError) {
      console.error('Error sending message:', sendError);
    }
    
  } catch (error) {
    console.error('Error testing WhatsApp service:', error);
  }
}

testWhatsAppService(); 