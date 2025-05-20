/**
 * WhatsApp Messaging Service
 * Handles specific messaging patterns for the sports booking application
 */

const whatsappService = require('./whatsapp');
const whatsappMessageTemplates = require('../utils/whatsappMessageTemplates');
const { formatTemplateComponents } = require('../utils/whatsappTemplates');

/**
 * Sends a welcome template message with badminton image followed by booking options
 * @param {string} phoneNumber - Recipient's phone number
 * @returns {Promise<Object>} - API response
 */
async function sendWelcomeMessage(phoneNumber) {
  try {
    console.log('🔄 Preparing welcome message with booking options...');
    
    // Create interactive buttons message that includes welcome text
    const buttonsMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: {
          type: 'image',
          image: {
            link: 'https://media.istockphoto.com/id/1033954336/photo/badminton-courts-with-players-competing.jpg?b=1&s=612x612&w=0&k=20&c=i2COuM0oYyXWcAgByGWFlImExjdtHiOM7orLhabf2sE='
          }
        },
        body: {
          text: 'Welcome to Sports Booking! How can we help you today?'
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'new_booking',
                title: 'New Booking'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'view_bookings',
                title: 'View My Bookings'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'cancel_booking',
                title: 'Cancel Booking'
              }
            }
          ]
        }
      }
    };
    
    // Send combined welcome message with buttons
    console.log('📤 Sending welcome message with booking options...');
    const response = await whatsappService.sendRawMessage(buttonsMessage);
    
    console.log('✅ Welcome message with options sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending welcome message:', error);
    throw error;
  }
}

/**
 * Sends an interactive list for sports selection
 * @param {string} phoneNumber - Recipient's phone number
 * @returns {Promise<Object>} - API response
 */
async function sendSportsSelectionList(phoneNumber) {
  try {
    console.log('🔄 Sending sports selection list...');
    
    // Create interactive list message
    const interactiveMessage = whatsappMessageTemplates.createSportsSelectionList(phoneNumber);
    
    // Send interactive message directly using the WhatsApp API
    const response = await whatsappService.sendRawMessage(interactiveMessage);
    
    console.log('✅ Sports selection list sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending sports selection list:', error);
    throw error;
  }
}

/**
 * Sends booking options buttons
 * @param {string} phoneNumber - Recipient's phone number
 * @returns {Promise<Object>} - API response
 */
async function sendBookingOptionsButtons(phoneNumber) {
  try {
    console.log('🔄 Sending booking options buttons...');
    
    // Create interactive buttons message
    const buttonsMessage = whatsappMessageTemplates.createBookingOptionsButtons(phoneNumber);
    
    // Send interactive message directly using the WhatsApp API
    const response = await whatsappService.sendRawMessage(buttonsMessage);
    
    console.log('✅ Booking options buttons sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending booking options buttons:', error);
    throw error;
  }
}

/**
 * Process incoming messages and respond appropriately
 * @param {Object} message - Message object from webhook
 * @returns {Promise<Object>} - Response object
 */
async function processIncomingMessage(message) {
  try {
    const { from, type, id: messageId } = message;
    console.log(`🔄 Processing incoming ${type} message from ${from} (ID: ${messageId})`);
    
    // Connect to database
    const connectToDatabase = require('../utils/connect-to-database');
    await connectToDatabase();
    
    // Check if this message has already been processed
    const FlowsState = require('../models/FlowsState');
    const existingState = await FlowsState.findOne({
      phoneNumber: from,
      processedMessages: messageId
    });
    
    if (existingState) {
      console.log(`⚠️ Message ${messageId} has already been processed, skipping`);
      return { success: false, reason: 'duplicate_message' };
    }
    
    // Get or create flow state for this user
    let flowState = await FlowsState.findOne({ phoneNumber: from }).sort({ updatedAt: -1 });
    
    if (!flowState) {
      // Create new flow state
      flowState = new FlowsState({
        flowToken: `flow_${from}_${Date.now()}`,
        phoneNumber: from,
        screen: 'welcome',
        processedMessages: [messageId]
      });
    } else {
      // Add this message ID to processed messages
      flowState.processedMessages.push(messageId);
    }
    
    // Save flow state
    await flowState.save();
    
    // Handle different message types
    if (type === 'text') {
      const { text } = message;
      const messageText = text.body.toLowerCase();
      
      // Check for keywords in the message
      if (messageText.includes('hello') || messageText.includes('hi') || messageText.includes('start')) {
        // Send only the welcome message with badminton image
        await sendWelcomeMessage(from);
        
        // Update flow state
        flowState.screen = 'welcome';
        await flowState.save();
      }
    } else if (type === 'interactive') {
      const { interactive } = message;
      
      // Handle button replies
      if (interactive.type === 'button_reply') {
        const buttonId = interactive.button_reply.id;
        
        if (buttonId === 'new_booking') {
          // Send sports selection list
          await sendSportsSelectionList(from);
          
          // Update flow state
          flowState.screen = 'sport_selection';
          await flowState.save();
        } else if (buttonId === 'view_bookings') {
          // Send message about viewing bookings
          await whatsappService.sendTextMessage(
            from,
            'Here are your current bookings. This feature is coming soon!'
          );
        } else if (buttonId === 'cancel_booking') {
          // Send message about canceling bookings
          await whatsappService.sendTextMessage(
            from,
            'To cancel a booking, please select which one. This feature is coming soon!'
          );
        } 
        // Handle duration selection
        else if (buttonId.startsWith('duration_')) {
          // Extract the duration from the ID
          const duration = parseInt(buttonId.replace('duration_', ''));
          
          // Get sport and date from flow state
          const sport = flowState.sport;
          const selectedDate = flowState.date;
          
          if (!sport || !selectedDate) {
            await whatsappService.sendTextMessage(
              from,
              'Sorry, we couldn\'t find your sport or date selection. Please start over.'
            );
            return;
          }
          
          // Update flow state
          flowState.duration = duration;
          flowState.screen = 'time_selection';
          await flowState.save();
          
          // Send available time slots
          await sendAvailableTimeSlots(from, sport, selectedDate, duration);
        }
        // Handle payment confirmation
        else if (buttonId === 'pay_now') {
          try {
            // Get booking details from flow state
            if (!flowState.sport || !flowState.date || !flowState.duration || !flowState.selectedSlotId) {
              await whatsappService.sendTextMessage(
                from,
                'Sorry, we couldn\'t find your booking details. Please start over.'
              );
              return;
            }
            
            // Create a booking record in the database
            const Booking = require('../models/Booking');
            const Court = require('../models/Court').default;
            
            // Find an available court for this sport
            const courts = await Court.find({ sport: flowState.sport, isActive: true });
            if (!courts || courts.length === 0) {
              await whatsappService.sendTextMessage(
                from,
                `Sorry, no courts are available for ${flowState.sport}. Please try a different sport.`
              );
              return;
            }
            
            // Use the first available court
            const court = courts[0];
            
            // Get selected time slot
            const selectedSlot = flowState.availableSlots.find(slot => slot.id === flowState.selectedSlotId);
            if (!selectedSlot) {
              await whatsappService.sendTextMessage(
                from,
                'Sorry, we couldn\'t find your selected time slot. Please try again.'
              );
              return;
            }
            
            // Parse time slot (format: "10:00")
            const startTime = selectedSlot.id;
            
            // Calculate end time based on duration
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const durationHours = flowState.duration;
            const endHourDecimal = startHour + durationHours;
            const endHour = Math.floor(endHourDecimal);
            const endMinute = startMinute + ((endHourDecimal - endHour) * 60);
            const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
            
            // Create a new booking
            const booking = new Booking({
              userId: flowState.userId || 'guest',
              sport: flowState.sport,
              courtId: court.courtId,
              date: new Date(flowState.date),
              startTime,
              endTime,
              duration: durationHours,
              amount: selectedSlot.price,
              customerName: flowState.name || 'Guest',
              customerEmail: flowState.email || '',
              customerPhone: from,
              specialRequirements: '',
              status: 'confirmed',
              paymentStatus: 'paid',
              paymentMethod: 'razorpay',
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            await booking.save();
            
            // Update flow state with booking ID
            flowState.bookingId = booking._id.toString();
            flowState.screen = 'booking_confirmed';
            await flowState.save();
            
            // Get booking details for confirmation
            const flowDbUtils = require('../utils/flowDbUtils');
            const priceDetails = await flowDbUtils.calculatePrice(
              flowState.sport,
              flowState.duration,
              flowState.date,
              startTime
            );
            
            // Format booking details for confirmation message
            const bookingDetails = {
              bookingId: booking._id.toString(),
              phoneNumber: from,
              sport: flowState.sport.charAt(0).toUpperCase() + flowState.sport.slice(1),
              date: new Date(flowState.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              }),
              time: selectedSlot.title,
              duration: flowState.duration,
              court: court.name,
              baseRate: priceDetails.baseRate,
              discountAmount: priceDetails.discountAmount,
              discountPercent: priceDetails.discountPercent,
              totalPrice: priceDetails.totalAmount,
              dayType: priceDetails.dayType,
              timePeriod: priceDetails.timePeriod
            };
            
            // Send confirmation message
            const messageTemplates = require('../utils/whatsappMessageTemplates');
            const confirmationTemplate = messageTemplates.createBookingConfirmationTemplate(bookingDetails);
            await whatsappService.sendRawMessage(confirmationTemplate);
          } catch (error) {
            console.error('❌ Error processing payment:', error);
            
            // Send error message
            await whatsappService.sendTextMessage(
              from,
              'Sorry, we encountered an error while processing your payment. Please try again later.'
            );
          }
        }
        // Handle payment cancellation
        else if (buttonId === 'cancel') {
          await whatsappService.sendTextMessage(
            from,
            'Your booking has been cancelled. Feel free to start a new booking when you\'re ready!'
          );
          
          // Update flow state
          flowState.screen = 'cancelled';
          await flowState.save();
        }
      }
      // Handle list replies
      else if (interactive.type === 'list_reply') {
        const listItemId = interactive.list_reply.id;
        
        // Check if this is a sport selection
        if (listItemId.startsWith('badminton') || 
            listItemId.startsWith('pickleball') || 
            listItemId.startsWith('cricket') || 
            listItemId.startsWith('football')) {
          // Extract sport from ID
          const sport = listItemId.split('-')[0];
          
          // Update flow state
          flowState.sport = sport;
          flowState.screen = 'date_selection';
          await flowState.save();
          
          // Send date selection calendar
          await sendDateSelectionCalendar(from, sport);
        }
        // Check if this is a date selection
        else if (listItemId.startsWith('date_')) {
          // Extract the date from the ID
          const selectedDate = listItemId.replace('date_', '');
          
          // Update flow state
          flowState.date = selectedDate;
          flowState.screen = 'duration_selection';
          await flowState.save();
          
          // Send duration selection
          await sendDurationSelection(from, flowState.sport, selectedDate);
        }
        // Check if this is a time slot selection
        else if (listItemId.startsWith('slot_')) {
          // Extract the slot ID from the ID
          const slotId = listItemId.replace('slot_', '');
          
          try {
            // Find the selected slot in available slots
            const selectedSlot = flowState.availableSlots.find(slot => slot.id === slotId);
            
            if (!selectedSlot) {
              await whatsappService.sendTextMessage(
                from,
                'Sorry, we couldn\'t find your selected time slot. Please try again.'
              );
              return;
            }
            
            // Update flow state
            flowState.selectedSlotId = slotId;
            flowState.screen = 'payment';
            await flowState.save();
            
            // Get booking details for payment template
            const flowDbUtils = require('../utils/flowDbUtils');
            const priceDetails = await flowDbUtils.calculatePrice(
              flowState.sport,
              flowState.duration,
              flowState.date,
              slotId
            );
            
            // Format booking details for payment message
            const bookingDetails = {
              phoneNumber: from,
              sport: flowState.sport.charAt(0).toUpperCase() + flowState.sport.slice(1),
              date: new Date(flowState.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              }),
              time: selectedSlot.title,
              duration: flowState.duration,
              court: `${flowState.sport.charAt(0).toUpperCase() + flowState.sport.slice(1)} Court`,
              baseRate: priceDetails.baseRate,
              discountAmount: priceDetails.discountAmount,
              discountPercent: priceDetails.discountPercent,
              totalPrice: priceDetails.totalAmount
            };
            
            // Create payment details
            const paymentDetails = {
              orderId: `order_${Date.now()}`
            };
            
            // Send payment template
            const messageTemplates = require('../utils/whatsappMessageTemplates');
            const paymentTemplate = messageTemplates.createPaymentTemplate(from, bookingDetails, paymentDetails);
            await whatsappService.sendRawMessage(paymentTemplate);
          } catch (error) {
            console.error('❌ Error processing time slot selection:', error);
            
            // Send error message
            await whatsappService.sendTextMessage(
              from,
              'Sorry, we encountered an error while processing your selection. Please try again later.'
            );
          }
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error processing incoming message:', error);
    throw error;
  }
}

/**
 * Sends available time slots for booking
 * @param {string} phoneNumber - User's phone number
 * @param {string} sportId - Selected sport ID
 * @param {string} selectedDate - Selected date
 * @param {number} duration - Selected duration in hours
 * @returns {Promise<Object>} - API response
 */
async function sendAvailableTimeSlots(phoneNumber, sportId, selectedDate, duration) {
  try {
    console.log('🔄 Sending available time slots...');
    
    // Get available time slots from database using flowDbUtils
    const flowDbUtils = require('../utils/flowDbUtils');
    const availableSlots = await flowDbUtils.getAvailableTimeSlots(sportId, selectedDate, duration);
    
    if (!availableSlots || availableSlots.length === 0) {
      // If no slots are available, send a message and return
      await whatsappService.sendTextMessage(
        phoneNumber,
        `Sorry, there are no ${duration}-hour slots available for ${sportId} on ${selectedDate}. Please try a different date or duration.`
      );
      return { success: false, reason: 'no_slots_available' };
    }
    
    // Calculate price for each slot
    const slotsWithPricing = await Promise.all(availableSlots.map(async (slot) => {
      try {
        // Get price for this slot using flowDbUtils
        const priceDetails = await flowDbUtils.calculatePrice(sportId, duration, selectedDate, slot.id);
        return {
          id: slot.id,
          title: slot.title,
          price: priceDetails.totalAmount
        };
      } catch (error) {
        console.error('Error calculating price for slot:', error);
        // Return slot with default price if calculation fails
        return {
          id: slot.id,
          title: slot.title,
          price: 400 * duration
        };
      }
    }));
    
    // Filter out disabled slots
    const enabledSlots = slotsWithPricing.filter(slot => {
      const originalSlot = availableSlots.find(s => s.id === slot.id);
      return originalSlot && originalSlot.enabled;
    });
    
    // Create rows for each available time slot - limit to 10 rows maximum (WhatsApp limit)
    const slotRows = enabledSlots.slice(0, 10).map(slot => ({
      id: `slot_${slot.id}`,
      title: slot.title,
      description: `₹${slot.price}`
    }));
    
    // Create interactive list message for time slot selection
    const timeSlotMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: `${sportId.charAt(0).toUpperCase() + sportId.slice(1)} - ${selectedDate}`
        },
        body: {
          text: `Available ${duration}-hour slots:`
        },
        footer: {
          text: `${duration} hour booking - Select a time slot`
        },
        action: {
          button: 'Select Time',
          sections: [
            {
              title: 'Available Times',
              rows: slotRows
            }
          ]
        }
      }
    };
    
    // Store the booking information in the flow state for later use
    const FlowsState = require('../models/FlowsState');
    const connectToDatabase = require('../utils/connect-to-database');
    await connectToDatabase();
    
    // Create a unique flow token for this booking session
    const flowToken = `booking_${phoneNumber}_${Date.now()}`;
    
    // Save the booking information
    await FlowsState.findOneAndUpdate(
      { flowToken },
      { 
        flowToken,
        sport: sportId,
        date: selectedDate,
        duration: duration,
        availableSlots: slotsWithPricing,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    // Send interactive message directly using the WhatsApp API
    const response = await whatsappService.sendRawMessage(timeSlotMessage);
    
    console.log('✅ Available time slots sent successfully:', response);
    return { success: true, response, flowToken };
  } catch (error) {
    console.error('❌ Error sending available time slots:', error);
    throw error;
  }
}

/**
 * Helper function to generate date options for the next 7 days
 * @returns {Array} Array of date options for list rows
 */
function generateDateOptions() {
  const dateOptions = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const formattedDate = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const dateId = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    dateOptions.push({
      id: `date_${dateId}`,
      title: formattedDate,
      description: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : ''
    });
  }
  
  return dateOptions;
}

/**
 * Helper function to get available time slots
 * @param {string} sportId - Sport ID
 * @param {string} date - Selected date
 * @param {number} duration - Duration in hours
 * @returns {Array} Array of available time slots
 */
async function getAvailableSlots(sportId, date, duration) {
  // Use flowDbUtils to get slots from database
  const flowDbUtils = require('../utils/flowDbUtils');
  try {
    // Get dynamic time slots from database
    const dbSlots = await flowDbUtils.getAvailableTimeSlots(sportId, date, duration);
    
    // If we have slots from the database, return them directly
    if (dbSlots && dbSlots.length > 0) {
      return dbSlots;
    }
    
    console.warn('No slots found in database, using fallback data');
  } catch (error) {
    console.error('Error fetching time slots from database:', error);
    // Continue to fallback if database query fails
  }
  
  // Fallback to mock data if database query fails or returns no results
  const timeSlots = [
    { id: "09:00", title: "9:00 AM - 10:00 AM" },
    { id: "10:00", title: "10:00 AM - 11:00 AM" },
    { id: "11:00", title: "11:00 AM - 12:00 PM" },
    { id: "14:00", title: "2:00 PM - 3:00 PM" },
    { id: "15:00", title: "3:00 PM - 4:00 PM" },
    { id: "17:00", title: "5:00 PM - 6:00 PM" }
  ];
  
  return timeSlots;
}

/**
 * Helper function to format time from 24-hour to 12-hour format
 * @param {string} time24 - Time in 24-hour format (HH:MM)
 * @returns {string} - Time in 12-hour format (h:MM AM/PM)
 */
function formatTime(time24) {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

/**
 * Creates a booking record in the database
 * @param {string} phoneNumber - User's phone number
 * @param {string} slotId - Selected slot ID
 * @returns {Promise<string>} - Booking ID
 */
async function createBooking(phoneNumber, slotId) {
  try {
    console.log(`🔄 Creating booking for slot ${slotId} for user ${phoneNumber}`);
    
    // Get the raw slot ID without the 'slot_' prefix
    const rawSlotId = slotId.replace('slot_', '');
    
    // Retrieve booking information from the flow state
    const FlowsState = require('../models/FlowsState');
    const Booking = require('../models/Booking');
    const Court = require('../models/Court').default;
    const connectToDatabase = require('../utils/connect-to-database');
    const flowDbUtils = require('../utils/flowDbUtils');
    
    // Connect to database
    await connectToDatabase();
    
    // Find the most recent flow state with this slot information
    const flowState = await FlowsState.findOne(
      { 'availableSlots.id': rawSlotId },
      {},
      { sort: { 'updatedAt': -1 } }
    );
    
    if (!flowState) {
      console.error(`No flow state found with slot ID ${rawSlotId}`);
      throw new Error(`Booking information not found for slot ${rawSlotId}`);
    }
    
    const sportId = flowState.sport;
    const selectedDate = new Date(flowState.date);
    const duration = parseFloat(flowState.duration);
    
    // Find the selected slot in the available slots
    const selectedSlot = flowState.availableSlots.find(slot => slot.id === rawSlotId);
    
    if (!selectedSlot) {
      throw new Error(`Slot ${rawSlotId} not found in flow state`);
    }
    
    // Find an available court for this sport
    const courts = await Court.find({ sport: sportId, isActive: true });
    if (!courts || courts.length === 0) {
      throw new Error(`No available courts found for sport: ${sportId}`);
    }
    const courtId = courts[0].courtId; // Use the first available court
    
    // Calculate price components using flowDbUtils
    const priceDetails = await flowDbUtils.calculatePrice(sportId, duration, flowState.date, rawSlotId);
    
    // Parse time slot (format: "10:00 AM - 11:00 AM")
    const startTime = rawSlotId;
    
    // Calculate end time based on duration
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const durationHours = parseFloat(duration);
    const endHourDecimal = startHour + durationHours;
    const endHour = Math.floor(endHourDecimal);
    const endMinute = startMinute + ((endHourDecimal - endHour) * 60);
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    
    // Create a new booking
    const booking = new Booking({
      userId: `whatsapp_${phoneNumber}`,
      sport: sportId,
      courtId: courtId,
      date: selectedDate,
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      customerName: 'WhatsApp User', // In a real app, you would get this from user profile
      customerPhone: phoneNumber,
      status: 'confirmed',
      amount: priceDetails.totalAmount,
      baseRate: priceDetails.baseRate,
      discountAmount: priceDetails.discountAmount,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      notes: `Booked via WhatsApp on ${new Date().toLocaleString()}`
    });
    
    // Save the booking to the database
    await booking.save();
    
    console.log(`✅ Booking created successfully with ID: ${booking._id}`);
    
    // Return the booking ID
    return `BK${booking._id.toString().slice(-6)}`;
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    throw error;
  }
}

/**
 * Get booking details for summary
 * @param {string} slotId - Selected slot ID
 * @returns {Promise<Object>} - Booking details
 */
async function getBookingDetails(slotId) {
  try {
    console.log(`🔍 Getting booking details for slot ${slotId}...`);
    
    // Get the raw slot ID without the 'slot_' prefix
    const rawSlotId = slotId.replace('slot_', '');
    
    // Retrieve booking information from the flow state
    const FlowsState = require('../models/FlowsState');
    const connectToDatabase = require('../utils/connect-to-database');
    await connectToDatabase();
    
    // Find the most recent flow state with this slot information
    const flowState = await FlowsState.findOne(
      { 'availableSlots.id': rawSlotId },
      {},
      { sort: { 'updatedAt': -1 } }
    );
    
    if (!flowState) {
      console.error(`No flow state found with slot ID ${rawSlotId}`);
      throw new Error(`Booking information not found for slot ${rawSlotId}`);
    }
    
    const sportId = flowState.sport;
    const selectedDate = flowState.date;
    const duration = flowState.duration;
    
    // Find the selected slot in the available slots
    const selectedSlot = flowState.availableSlots.find(slot => slot.id === rawSlotId);
    
    if (!selectedSlot) {
      throw new Error(`Slot ${rawSlotId} not found in flow state`);
    }
    
    // Get the sport configuration for additional details
    const flowDbUtils = require('../utils/flowDbUtils');
    const sportConfig = await flowDbUtils.getSportConfig(sportId);
    
    // Calculate price components using flowDbUtils
    const priceDetails = await flowDbUtils.calculatePrice(sportId, duration, selectedDate, rawSlotId);
    
    return {
      sport: sportId.charAt(0).toUpperCase() + sportId.slice(1),
      date: new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      time: selectedSlot.title,
      duration: duration,
      court: sportConfig ? `${sportId.charAt(0).toUpperCase() + sportId.slice(1)} Court` : 'Court',
      baseRate: priceDetails.baseRate,
      discountPercent: priceDetails.discountPercent,
      discountAmount: priceDetails.discountAmount,
      totalPrice: priceDetails.totalAmount || Math.round(priceDetails.totalBeforeDiscount - priceDetails.discountAmount),
      dayType: priceDetails.dayType,
      timePeriod: priceDetails.timePeriod
    };
  } catch (error) {
    console.error('❌ Error getting booking details:', error);
    throw error;
  }
}

/**
 * Sends a date selection calendar for a specific sport
 * @param {string} phoneNumber - Recipient's phone number
 * @param {string} sport - Selected sport
 * @returns {Promise<Object>} - API response
 */
async function sendDateSelectionCalendar(phoneNumber, sport) {
  try {
    console.log('🔄 Sending date selection calendar...');
    
    // Get available dates from database using flowDbUtils
    const flowDbUtils = require('../utils/flowDbUtils');
    const availableDates = await flowDbUtils.getAvailableDates();
    
    if (!availableDates || availableDates.length === 0) {
      // If no dates are available, send a message and return
      await whatsappService.sendTextMessage(
        phoneNumber,
        `Sorry, there are no available dates for ${sport} at the moment. Please try again later.`
      );
      return { success: false, reason: 'no_dates_available' };
    }
    
    // Create rows for each available date - limit to 10 rows maximum (WhatsApp limit)
    const dateRows = availableDates.slice(0, 10).map(date => ({
      id: `date_${date.id}`,
      title: date.title,
      description: `Available for ${sport}`
    }));
    
    // Create interactive list message for date selection
    const dateSelectionMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: `${sport.charAt(0).toUpperCase() + sport.slice(1)} Booking`
        },
        body: {
          text: 'Please select a date for your booking:'
        },
        footer: {
          text: 'Select a date to continue'
        },
        action: {
          button: 'Select Date',
          sections: [
            {
              title: 'Available Dates',
              rows: dateRows
            }
          ]
        }
      }
    };
    
    // Send interactive message directly using the WhatsApp API
    const response = await whatsappService.sendRawMessage(dateSelectionMessage);
    
    console.log('✅ Date selection calendar sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Error sending date selection calendar:', error);
    throw error;
  }
}

/**
 * Sends duration selection options for a specific sport and date
 * @param {string} phoneNumber - Recipient's phone number
 * @param {string} sport - Selected sport
 * @param {string} selectedDate - Selected date
 * @returns {Promise<Object>} - API response
 */
async function sendDurationSelection(phoneNumber, sport, selectedDate) {
  try {
    console.log('🔄 Sending duration selection options...');
    
    // Get available durations from database or use default options
    // For now, we'll use fixed options: 1, 2, and 3 hours
    const durationOptions = [
      { id: 'duration_1', title: '1 Hour', description: 'Standard booking' },
      { id: 'duration_2', title: '2 Hours', description: 'Extended booking' },
      { id: 'duration_3', title: '3 Hours', description: 'Long session' }
    ];
    
    // Create interactive buttons message for duration selection
    const durationMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: {
          type: 'text',
          text: `${sport.charAt(0).toUpperCase() + sport.slice(1)} - ${selectedDate}`
        },
        body: {
          text: 'How long would you like to book the court for?'
        },
        footer: {
          text: 'Select a duration to continue'
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'duration_1',
                title: '1 Hour'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'duration_2',
                title: '2 Hours'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'duration_3',
                title: '3 Hours'
              }
            }
          ]
        }
      }
    };
    
    // Send interactive message directly using the WhatsApp API
    const response = await whatsappService.sendRawMessage(durationMessage);
    
    console.log('✅ Duration selection options sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Error sending duration selection options:', error);
    throw error;
  }
}

// Make sure to export the function at the end of the file
module.exports = {
  sendWelcomeMessage,
  sendSportsSelectionList,
  sendBookingOptionsButtons,
  processIncomingMessage,
  sendDateSelectionCalendar,
  sendDurationSelection,
  sendAvailableTimeSlots,
  createBooking,
  getBookingDetails
};