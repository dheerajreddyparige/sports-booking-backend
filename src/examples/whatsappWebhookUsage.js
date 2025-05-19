/**
 * Example usage of WhatsApp webhook and messaging functionality
 */

const whatsappService = require('../services/whatsapp');
const whatsappTemplates = require('../utils/whatsappTemplates');
const FlowsState = require('../models/FlowsState');
const connectToDatabase = require('../utils/connect-to-database');

/**
 * Example: Send a booking confirmation message
 * @param {string} phoneNumber - Customer's phone number
 */
async function sendBookingConfirmation(phoneNumber, bookingData) {
  try {
    console.log('🔄 Preparing booking confirmation template...');
    
    // Create template data
    const templateData = whatsappTemplates.createBookingConfirmationTemplate(bookingData);
    
    // Format template components
    const components = whatsappTemplates.formatTemplateComponents(templateData);
    
    // Send template message
    console.log('📤 Sending booking confirmation template...');
    const response = await whatsappService.sendTemplate(
      phoneNumber,
      'booking_confirmation', // Template name (must be approved in WhatsApp Business Platform)
      'en_US',
      components
    );
    
    console.log('✅ Booking confirmation sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending booking confirmation:', error);
    throw error;
  }
}

/**
 * Example: Process an incoming message from webhook
 * @param {Object} message - Message object from webhook
 */
async function processIncomingMessage(message) {
  try {
    await connectToDatabase();
    
    const { from, id, type } = message;
    console.log(`📩 Processing incoming ${type} message from ${from}`);
    
    // Mark message as read
  //  await whatsappService.markMessageAsRead(id);
    
    // Process based on message type
    if (type === 'text') {
      const text = message.text.body.toLowerCase();
      
      // Simple keyword-based response
      if (text.includes('slot') || text.includes('reservation')) {
        // Send a flow message to start booking process
        const flowToken = `flow_${Date.now()}`;
        
        // Create a flow state record
        await FlowsState.create({
          flowToken,
          screen: 'BOOKING',
          data: {}
        });
        
        // Send flow message
        await whatsappService.sendFlowMessage(
          from,
          flowToken,
          'booking_flow_id', // Your WhatsApp Flow ID
          {}
        );
      } else if (text.includes('booking')) {
        // Send a simple text response
        await whatsappService.sendTextMessage(
          from,
          'Welcome to our sports booking service! You can book a court by typing "available time" or view your reservations by typing "my bookings".' 
        );
      } else {
        // Default response with image header template
        await whatsappService.sendTemplate(
          from,
          "appoitment",
          "en",
          [
            {
              type: "header",
              parameters: [
                {
                  type: "image",
                  image: {
                    link: "https://images.pexels.com/photos/31449901/pexels-photo-31449901.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                  }
                }
              ]
            }
          ]
        )
      }
    } else if (type === 'interactive') {
      // Handle interactive messages (button clicks, list selections)
      if (message.interactive.type === 'button_reply') {
        const buttonId = message.interactive.button_reply.id;
        
        if (buttonId === 'viewDetails') {
          // Handle view details button click
          await whatsappService.sendTextMessage(
            from,
            'Here are your booking details...'
          );
        } else if (buttonId === 'cancel') {
          // Handle cancellation button click
          await whatsappService.sendTextMessage(
            from,
            'Your booking has been cancelled.'
          );
        }
      }
    }
    
    console.log('✅ Message processed successfully');
  } catch (error) {
    console.error('❌ Error processing incoming message:', error);
    throw error;
  }
}

/**
 * Example: Send a custom template message
 * @param {string} phoneNumber - Customer's phone number
 * @param {Object} data - Template data
 */
async function sendCustomTemplate(phoneNumber, data) {
  try {
    // Create custom template components
    const components = [
      {
        type: 'header',
        parameters: [
          {
            type: 'text',
            text: data.headerText
          }
        ]
      },
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: data.name
          },
          {
            type: 'text',
            text: data.date
          },
          {
            type: 'text',
            text: data.time
          }
        ]
      }
    ];
    
    // Send template message
    const response = await whatsappService.sendTemplate(
      phoneNumber,
      data.templateName,
      'en_US',
      components
    );
    
    console.log('✅ Custom template sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending custom template:', error);
    throw error;
  }
}

module.exports = {
  sendBookingConfirmation,
  processIncomingMessage,
  sendCustomTemplate
};










