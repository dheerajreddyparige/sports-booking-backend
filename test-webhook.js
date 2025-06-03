/**
 * Test WhatsApp Flow Webhook Handler
 */
require('dotenv').config();
const WhatsAppWebhookController = require('./src/controllers/whatsapp/webhook');

async function testWebhook() {
  try {
    console.log('Testing WhatsApp Flow completion webhook handler...');
    
    // Create a mock flow completion message
    const mockMessage = {
      from: '919876543210', // Replace with your test number
      id: 'test_message_' + Date.now(),
      timestamp: Date.now(),
      type: 'interactive',
      interactive: {
        type: 'nfm_reply',
        nfm_reply: {
          response_json: JSON.stringify({
            flow_token: 'flows-builder-3631d11a',
            booking_id: 'BK' + Date.now(),
            sport: 'badminton',
            date: '2023-06-04',
            time_slot: '17:00',
            duration: 2,
            name: 'Test User',
            email: 'test@example.com',
            phone: '919876543210'
          })
        }
      }
    };
    
    // Mock contacts array
    const mockContacts = [
      {
        profile: {
          name: 'Test User'
        }
      }
    ];
    
    // Call the webhook handler
    console.log('Calling webhook handler with mock message...');
    await WhatsAppWebhookController.handleIncomingMessage(mockMessage, mockContacts);
    console.log('Webhook handler executed');
    
  } catch (error) {
    console.error('Error testing webhook handler:', error);
  }
}

testWebhook(); 