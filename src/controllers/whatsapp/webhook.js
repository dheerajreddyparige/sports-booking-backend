const crypto = require('crypto');
const { FlowEndpointException } = require('../../utils/encryption');
const FlowsState = require('../../models/mysql/FlowsState.js');
const whatsappMessaging = require('../../services/whatsappMessaging');
const connectToDatabase = require('../../utils/mysql-connection');

/**
 * WhatsApp Webhook Controller
 * Handles incoming webhook requests from WhatsApp
 */
class WhatsAppWebhookController {
  /**
   * Handles incoming webhook requests from WhatsApp
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async handleWebhook(req, res) {
    console.log('📥 Received WhatsApp webhook request');
    

    // Handle WhatsApp verification challenge
    if (req.method === 'GET') {
      return WhatsAppWebhookController.handleVerificationChallenge(req, res);
    }

    // Process webhook payload
    try {
      await connectToDatabase();
      const { object, entry } = req.body;
      
      if (object !== 'whatsapp_business_account') {
        console.error('❌ Unexpected webhook object type:', object);
        return res.status(400).json({ error: 'Unexpected webhook object type' });
      }

      console.log('📋 Processing webhook entry:', JSON.stringify(entry, null, 2));
      
      // Process each entry in the webhook payload
      for (const entryItem of entry) {
        await WhatsAppWebhookController.processEntry(entryItem);
      }

      // Always return a 200 OK to acknowledge receipt
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handles the verification challenge from WhatsApp
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static handleVerificationChallenge(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('🔍 Verification challenge request:', {
      mode,
      token,
      challenge,
      headers: req.headers,
      query: req.query
    });

    // Verify the mode and token
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('✅ Webhook verified successfully');
      return res.status(200).send( challenge );
    }

    console.error('❌ Webhook verification failed');
    return res.status(403).json({ error: 'Verification failed' });
  }

  /**
   * Processes a webhook entry
   * @param {Object} entry - Webhook entry object
   */
  static async processEntry(entry) {
    const { changes } = entry;
    
    for (const change of changes) {
      const { value } = change;
      
      if (value.messaging_product === 'whatsapp') {
        await WhatsAppWebhookController.processWhatsAppMessages(value);
      }
    }
  }

  /**
   * Processes WhatsApp messages
   * @param {Object} value - WhatsApp message value
   */
  static async processWhatsAppMessages(value) {
    const { messages, contacts, statuses } = value;
    
    // Process incoming messages
    if (messages && messages.length > 0) {
      for (const message of messages) {
        await WhatsAppWebhookController.handleIncomingMessage(message, contacts);
      }
    }
    
    // Process message statuses
    if (statuses && statuses.length > 0) {
      for (const status of statuses) {
        await WhatsAppWebhookController.handleMessageStatus(status);
      }
    }
  }

  /**
   * Handles an incoming message
   * @param {Object} message - Message object
   * @param {Array} contacts - Contacts array
   */
  static async handleIncomingMessage(message, contacts) {
    const { from, id, timestamp, type, context } = message;
    console.log('📩 Received message:', { from, id, timestamp, type });
    
    // Handle different message types
    switch (type) {
      case 'text':
        await WhatsAppWebhookController.handleTextMessage(message, contacts);
        break;
      case 'interactive':
        await WhatsAppWebhookController.handleInteractiveMessage(message, contacts);
        break;
      case 'button':
        await WhatsAppWebhookController.handleButtonMessage(message, contacts);
        break;
      case 'template':
        await WhatsAppWebhookController.handleTemplateMessage(message, contacts);
        break;
      default:
        console.log(`⚠️ Unhandled message type: ${type}`);
    }
    
    // If this is a reply to a flow message, update the flow state
    if (context && context.id) {
      await WhatsAppWebhookController.updateFlowState(context.id, message);
    }
  }

  /**
   * Handles a text message
   * @param {Object} message - Message object
   * @param {Array} contacts - Contacts array
   */
  static async handleTextMessage(message, contacts) {
    const { from, text } = message;
    console.log('📝 Text message received:', text.body);
    
    try {
      // Get customer info from contacts if available
      const customer = contacts && contacts.length > 0 ? contacts[0] : null;
      const customerName = customer ? customer.profile?.name || 'Customer' : 'Customer';
      
      console.log(`👤 Message from: ${from} (${customerName})`);
      
      // Check if it's a greeting message
      const messageText = text.body.toLowerCase().trim();
      const greetings = ['hello', 'hi', 'hey', 'hola', 'start', 'help'];
      const isGreeting = greetings.some(greeting => 
        messageText === greeting || 
        messageText.startsWith(`${greeting} `) || 
        messageText.includes(`${greeting}`)
      );
      
      if (isGreeting) {
        console.log('👋 Greeting detected, sending language selection...');
        await whatsappMessaging.sendLanguageSelectionMessage(from);
        console.log('✅ Language selection message sent in response to greeting');
        return;
      }
      
      // Process the message through the WhatsApp messaging service
      console.log('🔄 Processing message through messaging service...');
      const result = await whatsappMessaging.processIncomingMessage(message);
      
      // Log processing result
      if (result && result.success) {
        console.log(`✅ Message successfully processed: ${result.action || 'Action taken'}`);
      } else {
        // If the message didn't match any specific patterns, send default language selection
        console.log('⚠️ Message not specifically handled, sending default welcome message');
        await whatsappMessaging.sendLanguageSelectionMessage(from);
        console.log('✅ Sent language selection message as fallback');
      }
    } catch (error) {
      console.error('❌ Error handling text message:', error);
      
      // Send fallback message in case of errors
      try {
        await whatsappMessaging.sendLanguageSelectionMessage(from);
        console.log('✅ Sent language selection message as error fallback');
      } catch (fallbackError) {
        console.error('❌ Critical error sending fallback message:', fallbackError);
      }
    }
  }

  /**
   * Handles an interactive message
   * @param {Object} message - Message object
   * @param {Array} contacts - Contacts array
   */
  static async handleInteractiveMessage(message, contacts) {
    const { from, interactive } = message;
    console.log('🔄 Interactive message received:', interactive.type);
    
    try {
      const interactiveType = interactive.type;
      
      if (interactiveType === 'button_reply') {
        const buttonId = interactive.button_reply.id;
        console.log(`🔘 Button reply with ID: ${buttonId}`);
        
        // Handle language selection
        if (buttonId === 'language_english' || buttonId === 'language_telugu') {
          const language = buttonId === 'language_english' ? 'english' : 'telugu';
          console.log(`🌐 User selected ${language} language`);
          
          // Update flow state with language choice
          const FlowsState = require('../../models/mysql/FlowsState');
          const pool = await connectToDatabase();
          const flowState = await FlowsState.findOne({ phoneNumber: from });
          
          if (flowState) {
            await pool.query(
              'UPDATE flows_state SET language = ?, screen = ? WHERE id = ?',
              [language, 'main_menu', flowState.id]
            );
            console.log(`✅ Flow state updated with language: ${language}`);
          }
          
          // Send main menu in selected language
          await whatsappMessaging.sendMainMenuMessage(from, language);
          console.log(`✅ Main menu sent in ${language}`);
          return;
        }
        
        // Handle new booking button
        if (buttonId === 'new_booking') {
          console.log('🔄 User selected new booking button');
          
          // Update flow state
          const FlowsState = require('../../models/mysql/FlowsState');
          const pool = await connectToDatabase();
          
          // Get or create flow state
          let flowState = await FlowsState.findOne({ phoneNumber: from });
          if (flowState) {
            await pool.query(
              'UPDATE flows_state SET screen = ? WHERE id = ?',
              ['booking', flowState.id]
            );
          } else {
            await FlowsState.create({
              flowToken: `flow_${from}_${Date.now()}`,
              phoneNumber: from,
              screen: 'booking',
              processedMessages: []
            });
          }
          
          console.log('✅ Flow state updated for booking');
          
          // Send booking flow
          await whatsappMessaging.sendBookingFlow(from);
          console.log('✅ Booking flow initiated');
          return;
        }
        
        // Handle payment option selections
        if (buttonId === 'pay_upi' || buttonId === 'pay_razorpay') {
          console.log(`💳 User selected payment method: ${buttonId}`);
          
          // Find the latest pending booking for this user
          const bookingService = require('../../services/bookingService');
          const latestBooking = await bookingService.getLatestPendingBookingByPhone(from);
          
          if (!latestBooking) {
            console.log('❌ No pending booking found for this user');
            await whatsappMessaging.sendTextMessage(from, 'Sorry, we could not find a pending booking for you. Please try booking again.');
            return;
          }
          
          // Process payment based on selected method
          const handleFlowCompletion = require('./payments/handleFlowCompletion');
          if (buttonId === 'pay_upi') {
            await handleFlowCompletion.processUpiPayment({
              body: { to: from, booking_id: latestBooking.booking_id }
            }, { status: () => ({ json: () => {} }) });
          } else if (buttonId === 'pay_razorpay') {
            await handleFlowCompletion.processRazorpayPayment({
              body: { to: from, booking_id: latestBooking.booking_id }
            }, { status: () => ({ json: () => {} }) });
          }
          
          console.log('✅ Payment processing initiated');
          return;
        }
        
        // Process other button replies
        await whatsappMessaging.processIncomingMessage(message);
      } 
      else if (interactiveType === 'list_reply') {
        const listItemId = interactive.list_reply.id;
        console.log(`📋 List selection with ID: ${listItemId}`);
        
        // Handle main menu options
        if (listItemId === 'new_booking') {
          console.log('🔄 User selected new booking from list');
          
          // Update flow state
          const FlowsState = require('../../models/mysql/FlowsState');
          const pool = await connectToDatabase();
          
          // Get or create flow state
          let flowState = await FlowsState.findOne({ phoneNumber: from });
          if (flowState) {
            await pool.query(
              'UPDATE flows_state SET screen = ? WHERE id = ?',
              ['booking', flowState.id]
            );
          } else {
            await FlowsState.create({
              flowToken: `flow_${from}_${Date.now()}`,
              phoneNumber: from,
              screen: 'booking',
              processedMessages: []
            });
          }
          
          console.log('✅ Flow state updated for booking');
          
          // Send booking flow
          await whatsappMessaging.sendBookingFlow(from);
          console.log('✅ Booking flow initiated from list selection');
          return;
        }
        
        if (listItemId === 'my_bookings') {
          console.log('📋 User requested to view their bookings');
          await whatsappMessaging.sendTextMessage(from, "You can view your upcoming bookings here. This feature is coming soon!");
          return;
        }
        
        if (listItemId === 'available_slots') {
          console.log('🕒 User requested to view available slots');
          await whatsappMessaging.sendTextMessage(from, "You can check available time slots here. This feature is coming soon!");
          return;
        }
        
        // Process other list replies
        await whatsappMessaging.processIncomingMessage(message);
      } 
      else {
        // Process other interactive types
        await whatsappMessaging.processIncomingMessage(message);
      }
    } catch (error) {
      console.error('❌ Error handling interactive message:', error);
      
      // Send fallback message in case of errors
      try {
        await whatsappMessaging.sendMainMenuMessage(from);
        console.log('✅ Sent main menu message as error fallback');
      } catch (fallbackError) {
        console.error('❌ Critical error sending fallback message:', fallbackError);
      }
    }
  }

  static async handleButtonMessage(message, contacts) {
    const { from, button } = message;
    console.log('🔘 Button message:', button);
    
    // Process button message through the service
    await whatsappMessaging.processIncomingMessage(message);
  }

  static async handleTemplateMessage(message, contacts) {
    const { from, template } = message;
    console.log('📋 Template message:', template);
    
    // Process template message through the service
    await whatsappMessaging.processIncomingMessage(message);
  }

  /**
   * Handles a message status update
   * @param {Object} status - Status object
   */
  static async handleMessageStatus(status) {
    const { id, status: statusType, timestamp } = status;
    console.log('📊 Message status update:', { id, status: statusType, timestamp });
    
    // Process status update logic here
    // This could include updating message delivery status in the database
  }

  /**
   * Updates the flow state based on a message
   * @param {string} contextId - Context ID
   * @param {Object} message - Message object
   */
  static async updateFlowState(contextId, message) {
    try {
      // Extract flow token from context ID if available
      const flowTokenMatch = contextId.match(/flow_token=(\w+)/);
      if (!flowTokenMatch) {
        console.log('⚠️ No flow token found in context ID');
        return;
      }
      
      const flowToken = flowTokenMatch[1];
      console.log('🔍 Updating flow state for token:', flowToken);
      
      // Find the flow state
      const flowState = await FlowsState.findOne({ flowToken });
      if (!flowState) {
        console.log('⚠️ No flow state found for token:', flowToken);
        return;
      }
      
      // Update the flow state based on the message type
      const { type } = message;
      let updateData = {};
      
      switch (type) {
        case 'text':
          updateData = { 'data.userResponse': message.text.body };
          break;
        case 'interactive':
          if (message.interactive.type === 'button_reply') {
            updateData = { 'data.userSelection': message.interactive.button_reply.id };
          } else if (message.interactive.type === 'list_reply') {
            updateData = { 'data.userSelection': message.interactive.list_reply.id };
          }
          break;
        // Add more cases as needed
      }
      
      // Update the flow state
      if (Object.keys(updateData).length > 0) {
        await FlowsState.updateOne({ flowToken }, { $set: updateData, $set: { updatedAt: new Date() } });
        console.log('✅ Flow state updated successfully');
      }
    } catch (error) {
      console.error('❌ Error updating flow state:', error);
    }
  }

}

module.exports = WhatsAppWebhookController;
