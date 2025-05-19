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
async function sendWelcomeMessage(phoneNumber, bookingData) {
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
/**
 * Send appointment welcome message with language selection
 * @param {string} phoneNumber - Customer's phone number
 */
async function sendAppointmentWelcome(phoneNumber) {
  try {
    console.log('🔄 Sending appointment welcome message...');
    
    // Create template data
    const templateData = whatsappTemplates.createWelcomeTemplate();
    
    // Format template components
    const components = whatsappTemplates.formatTemplateComponents(templateData);
    
    // Send template message
    const response = await whatsappService.sendTemplate(
      phoneNumber,
      'appointment_welcome',
      'en_US',
      components
    );
    
    console.log('✅ Appointment welcome message sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending appointment welcome message:', error);
    throw error;
  }
}

/**
 * Send appointment form with interactive message
 * @param {string} phoneNumber - Customer's phone number
 */
async function sendAppointmentForm(phoneNumber) {
  try {
    console.log('🔄 Sending appointment form...');
    
    // Create interactive message with form elements
    const interactive = {
      type: 'list',
      header: {
        type: 'text',
        text: 'Appoint'
      },
      body: {
        text: 'Use this form to fill the Details'
      },
      action: {
        button: 'SELECT',
        sections: [
          {
            title: 'Payment Method',
            rows: [
              {
                id: 'pay_online',
                title: 'Pay Online',
                description: 'Pay using a credit or debit card'
              },
              {
                id: 'pay_direct',
                title: 'Pay Directly',
                description: 'Pay in person'
              }
            ]
          }
        ]
      }
    };
    
    // Send interactive message
    const response = await whatsappService.sendInteractiveMessage(
      phoneNumber,
      interactive
    );
    
    console.log('✅ Appointment form sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending appointment form:', error);
    throw error;
  }
}

/**
 * Send appointment confirmation with details
 * @param {string} phoneNumber - Customer's phone number
 * @param {Object} appointmentData - Appointment details
 */
async function sendAppointmentConfirmation(phoneNumber, appointmentData) {
  try {
    console.log('🔄 Preparing appointment confirmation...');
    
    // Create template data
    const templateData = whatsappTemplates.createAppointmentConfirmationTemplate(appointmentData);
    
    // Format template components
    const components = whatsappTemplates.formatTemplateComponents(templateData);
    
    // Send template message
    const response = await whatsappService.sendTemplate(
      phoneNumber,
      'appointment_confirmation',
      'en_US',
      components
    );
    
    console.log('✅ Appointment confirmation sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending appointment confirmation:', error);
    throw error;
  }
}

/**
 * Send payment instructions
 * @param {string} phoneNumber - Customer's phone number
 * @param {Object} appointmentData - Appointment details
 */
async function sendPaymentInstructions(phoneNumber, appointmentData) {
  try {
    console.log('🔄 Preparing payment instructions...');
    
    // Create template data
    const templateData = whatsappTemplates.createPaymentInstructionTemplate(appointmentData);
    
    // Format template components
    const components = whatsappTemplates.formatTemplateComponents(templateData);
    
    // Send template message
    const response = await whatsappService.sendTemplate(
      phoneNumber,
      'payment_instructions',
      'en_US',
      components
    );
    
    console.log('✅ Payment instructions sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending payment instructions:', error);
    throw error;
  }
}

// Update the processIncomingMessage function to handle appointment-related messages
async function processIncomingMessage(message) {
  try {
    await connectToDatabase();
    
    const { from, id, type } = message;
    console.log(`📩 Processing incoming ${type} message from ${from}`);
    
    // Mark message as read
    await whatsappService.markMessageAsRead(id);
    
    // Process based on message type
    if (type === 'text') {
      const text = message.text.body.toLowerCase();
      
      // Handle appointment-related keywords
      if (text.includes('appoint') || text.includes('book')) {
        // Start appointment booking process
        await sendAppointmentWelcome(from);
      } else if (text.includes('booking')) {
        // Original text response
        await whatsappService.sendTextMessage(
          from,
          'Welcome to our sports booking service! You can book a court by typing "available time" or view your reservations by typing "my bookings".' 
        );
      } else {
        // Default response with appointment template
        await sendAppointmentForm(from);
      }
    } else if (type === 'interactive') {
      // Handle interactive messages (button clicks, list selections)
      if (message.interactive.type === 'button_reply') {
        const buttonId = message.interactive.button_reply.id;
        
        if (buttonId === 'confirm') {
          // Handle confirmation button click
          const appointmentData = {
            name: 'Prasath', // In a real app, this would come from user input or database
            date: '2025-04-11',
            time: '15:30-16:00',
            paymentMethod: 'Pay Online'
          };
          
          await sendPaymentInstructions(from, appointmentData);
        } else if (buttonId === 'cancel') {
          // Handle cancellation button click
          await whatsappService.sendTextMessage(
            from,
            'Your appointment has been cancelled.'
          );
        } else if (buttonId === 'pay') {
          // Handle pay button click
          await whatsappService.sendTextMessage(
            from,
            'Redirecting to payment gateway...'
          );
        }
      } else if (message.interactive.type === 'list_reply') {
        const listReplyId = message.interactive.list_reply.id;
        
        if (listReplyId === 'pay_online' || listReplyId === 'pay_direct') {
          // Create appointment data based on selection
          const appointmentData = {
            name: 'Prasath', // In a real app, this would come from user input or database
            date: '2025-04-11',
            time: '15:30-16:00',
            paymentMethod: listReplyId === 'pay_online' ? 'Pay Online' : 'Pay Directly'
          };
          
          // Send appointment confirmation
          await sendAppointmentConfirmation(from, appointmentData);
        } else if (listReplyId === 'english') {
          // Handle language selection
          await sendAppointmentForm(from);
        }
      }
    }
    
    console.log('✅ Message processed successfully');
  } catch (error) {
    console.error('❌ Error processing incoming message:', error);
    throw error;
  }
}

// Export the new functions
module.exports = {
  sendBookingConfirmation,
  sendWelcomeMessage,
  processIncomingMessage,
  sendCustomTemplate,
  sendAppointmentWelcome,
  sendAppointmentForm,
  sendAppointmentConfirmation,
  sendPaymentInstructions
};










