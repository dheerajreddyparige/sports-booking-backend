/**
 * WhatsApp Messaging Service
 * Handles specific messaging patterns for the sports booking application
 */

const whatsappService = require('./whatsapp');
const whatsappMessageTemplates = require('../utils/whatsappMessageTemplates');
const { formatTemplateComponents } = require('../utils/whatsappTemplates');
const Booking = require('../models/mysql/Booking.js');
const Court = require('../models/mysql/Court.js');

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
    const connectToDatabase = require('../utils/mysql-connection.js');
    await connectToDatabase();
    
    // Check if this message has already been processed
    const FlowsState = require('../models/mysql/FlowsState');
    const existingState = await FlowsState.findOne({
      phoneNumber: from,
      processedMessages: messageId
    });
    
    if (existingState) {
      console.log(`⚠️ Message ${messageId} has already been processed, skipping`);
      return { success: false, reason: 'duplicate_message' };
    }
    
    // Get most recent flow state for this user
    let flowState = await FlowsState.findOne({ phoneNumber: from });
    
    if (!flowState) {
      // Create new flow state
      flowState = await FlowsState.create({
        flowToken: `flow_${from}_${Date.now()}`,
        phoneNumber: from,
        screen: 'welcome',
        processedMessages: [messageId]
      });
    } else {
      // Add this message ID to processed messages
      const updatedProcessedMessages = [...(flowState.processedMessages || []), messageId];
      await FlowsState.update(flowState.id, {
        processedMessages: updatedProcessedMessages
      });
      flowState.processedMessages = updatedProcessedMessages;
    }
    
    // Handle different message types
    if (type === 'text') {
      const { text } = message;
      const messageText = text.body.toLowerCase().trim();
      
      // Check for greeting keywords in the message
      if (messageText === 'hello' || messageText === 'hi' || messageText === 'start' || 
          messageText === 'hey' || messageText === 'hola') {
        console.log('👋 User sent greeting message, sending language selection...');
        
        // Send welcome message with language selection
        await sendLanguageSelectionMessage(from);
        
        // Update flow state
        await FlowsState.update(flowState.id, { screen: 'language_selection' });
        
        return { success: true, action: 'language_selection_sent' };
      }
    } else if (type === 'interactive') {
      const { interactive } = message;
      
      // Handle button replies
      if (interactive.type === 'button_reply') {
        const buttonId = interactive.button_reply.id;
        
        if (buttonId === 'language_english') {
          // User selected English language
          await FlowsState.update(flowState.id, { language: 'english' });
          
          // Send main menu
          await sendMainMenuMessage(from);
          
          // Update flow state
          await FlowsState.update(flowState.id, { screen: 'main_menu' });
          
          return { success: true, action: 'english_selected_main_menu_sent' };
        } else if (buttonId === 'language_telugu') {
          // User selected Telugu language
          await FlowsState.update(flowState.id, { language: 'telugu' });
          
          // For now, just use English flow with Telugu messages
          // In future, implement full Telugu support
          await sendMainMenuMessage(from, 'telugu');
          
          // Update flow state
          await FlowsState.update(flowState.id, { screen: 'main_menu' });
          
          return { success: true, action: 'telugu_selected_main_menu_sent' };
        }
      }
      
      // Handle list replies
      if (interactive.type === 'list_reply') {
        const listItemId = interactive.list_reply.id;
        
        if (listItemId === 'new_booking') {
          console.log('🔄 User selected new booking, starting booking flow...');
          
          // Update flow state
          await FlowsState.update(flowState.id, { screen: 'booking' });
          
          // Send the WhatsApp Flow for booking
          await sendBookingFlow(from);
          
          return { success: true, action: 'booking_flow_started' };
        } else if (listItemId === 'my_bookings') {
          // Handle my bookings selection (to be implemented)
          return { success: true, action: 'my_bookings_selected' };
        } else if (listItemId === 'available_slots') {
          // Handle available slots selection (to be implemented)
          return { success: true, action: 'available_slots_selected' };
        }
      }
    }
    
    console.log(`⚠️ No specific handler for message: ${type}`);
    return { success: false, reason: 'no_handler' };
  } catch (error) {
    console.error('❌ Error processing incoming message:', error);
    return { success: false, error };
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
async function sendAvailableTimeSlots(phoneNumber, sportId, selectedDate, duration, page = 0) {
  try {
    console.log('🔄 Sending available time slots...', { phoneNumber, sportId, selectedDate, duration, page });
    const flowDbUtils = require('../utils/flowDbUtils');
    const SLOTS_PER_PAGE = 9;
    const availableSlots = await flowDbUtils.getAvailableTimeSlots(sportId, selectedDate, duration, undefined, page);
    console.log('Available slots returned:', availableSlots);
    if (!availableSlots || !availableSlots.slots || availableSlots.slots.length === 0) {
      await whatsappService.sendTextMessage(
        phoneNumber,
        `Sorry, there are no ${duration}-hour slots available for ${sportId} on ${selectedDate}. Please try a different date or duration.`
      );
      return { success: false, reason: 'no_slots_available' };
    }
    const slotsWithPricing = await Promise.all(availableSlots.slots.map(async (slot) => {
      try {
        const priceDetails = await flowDbUtils.calculatePrice(sportId, duration, selectedDate, slot.id);
        return {
          id: slot.id,
          title: slot.title,
          price: priceDetails.totalAmount,
          hour: parseInt(slot.id.split(':')[0])
        };
      } catch (error) {
        return {
          id: slot.id,
          title: slot.title,
          price: 400 * duration,
          hour: parseInt(slot.id.split(':')[0])
        };
      }
    }));
    const enabledSlots = slotsWithPricing.filter(slot => {
      const originalSlot = availableSlots.slots.find(s => s.id === slot.id);
      return originalSlot && originalSlot.enabled;
    });
    // Pagination logic
    const hasMorePages = availableSlots.pagination.hasMorePages;
    const currentPage = availableSlots.pagination.currentPage;
    // Prepare slotRows for WhatsApp interactive list
    let slotRows = enabledSlots.map(slot => ({
      id: `slot_${slot.id}`,
      title: `${slot.id} - ${parseInt(slot.id.split(':')[0]) + duration}:${slot.id.split(':')[1]}`,
      description: `₹${slot.price}`
    }));
    // If there are more pages, add a "Show more" option as the last row
    if (hasMorePages) {
      slotRows = slotRows.slice(0, SLOTS_PER_PAGE - 1); // 8 slots
      slotRows.push({
        id: `show_more_${currentPage + 1}`,
        title: 'Show more',
        description: 'See more available slots'
      });
    } else {
      slotRows = slotRows.slice(0, SLOTS_PER_PAGE);
    }
    // Save available slots and page info in flow state
    const FlowsState = require('../models/mysql/FlowsState');
    const connectToDatabase = require('../utils/mysql-connection.js');
    await connectToDatabase();
    let flowState = await FlowsState.findOne({ phoneNumber }).sort({ updatedAt: -1 });
    if (!flowState) {
      flowState = new FlowsState({
        flowToken: `flow_${phoneNumber}_${Date.now()}`,
        phoneNumber,
        screen: 'time_selection',
        sport: sportId,
        date: selectedDate,
        duration: duration,
        availableSlots: enabledSlots,
        slotPage: currentPage,
        updatedAt: new Date()
      });
    } else {
      flowState.sport = sportId;
      flowState.date = selectedDate;
      flowState.duration = duration;
      flowState.availableSlots = enabledSlots;
      flowState.slotPage = currentPage;
      flowState.screen = 'time_selection';
      flowState.updatedAt = new Date();
    }
    await flowState.save();
    // Send WhatsApp interactive list message
    const timeSlotMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: `Available ${duration}-hour slots for ${sportId.charAt(0).toUpperCase() + sportId.slice(1)} on ${selectedDate}`
        },
        body: {
          text: 'Please select from the following time slots:'
        },
        footer: {
          text: `${enabledSlots.length} slots available${hasMorePages ? ' - Use Show more to see next slots' : ''}`
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
    await whatsappService.sendRawMessage(timeSlotMessage);
    return { success: true };
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
    const FlowsState = require('../models/mysql/FlowsState');
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
    const FlowsState = require('../models/mysql/FlowsState');
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

/**
 * Sends language selection message to user
 * @param {string} phoneNumber - Recipient's phone number
 * @returns {Promise<Object>} - API response
 */
async function sendLanguageSelectionMessage(phoneNumber) {
  try {
    console.log('🔄 Sending language selection message...');
    
    const languageMessage = {
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
          text: 'Welcome to PitZone - The Best Sports Facility! 🏸⚽🏓\n\nPlease select your preferred language:'
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'language_english',
                title: 'English'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'language_telugu',
                title: 'తెలుగు (Telugu)'
              }
            }
          ]
        }
      }
    };
    
    const response = await whatsappService.sendRawMessage(languageMessage);
    console.log('✅ Language selection message sent successfully');
    return response;
  } catch (error) {
    console.error('❌ Error sending language selection message:', error);
    throw error;
  }
}

/**
 * Sends main menu message with booking options
 * @param {string} phoneNumber - Recipient's phone number
 * @param {string} language - Selected language (english or telugu)
 * @returns {Promise<Object>} - API response
 */
async function sendMainMenuMessage(phoneNumber, language = 'english') {
  try {
    console.log(`🔄 Sending main menu message in ${language}...`);
    
    // Set text based on selected language
    const headerText = language === 'english' ? 'Main Menu' : 'ప్రధాన మెను';
    const bodyText = language === 'english' ? 
      'What would you like to do today?' : 
      'మీరు ఈరోజు ఏమి చేయాలనుకుంటున్నారు?';
    const footerText = language === 'english' ? 
      'Select an option from the menu' : 
      'మెనుల నుండి ఒక ఎంపికను ఎంచుకోండి';
    const buttonText = language === 'english' ? 'Select Option' : 'ఎంపికను ఎంచుకోండి';
    
    // Option titles based on language
    const newBookingTitle = language === 'english' ? 'New Booking' : 'కొత్త బుకింగ్';
    const myBookingsTitle = language === 'english' ? 'My Bookings' : 'నా బుకింగ్‌లు';
    const availableSlotsTitle = language === 'english' ? 'Available Time Slots' : 'అందుబాటులో ఉన్న సమయ స్లాట్లు';
    
    // Descriptions based on language
    const newBookingDesc = language === 'english' ? 'Book a new sports session' : 'క్రీడా సెషన్ బుక్ చేసుకోండి';
    const myBookingsDesc = language === 'english' ? 'View your existing bookings' : 'మీ ప్రస్తుత బుకింగ్‌లను వీక్షించండి';
    const availableSlotsDesc = language === 'english' ? 'Check available time slots' : 'అందుబాటులో ఉన్న సమయ స్లాట్లను తనిఖీ చేయండి';
    
    // Section title based on language
    const sectionTitle = language === 'english' ? 'Booking Options' : 'బుకింగ్ ఎంపికలు';
    
    const mainMenuMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
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
          sections: [
            {
              title: sectionTitle,
              rows: [
                {
                  id: 'new_booking',
                  title: newBookingTitle,
                  description: newBookingDesc
                },
                {
                  id: 'my_bookings',
                  title: myBookingsTitle,
                  description: myBookingsDesc
                },
                {
                  id: 'available_slots',
                  title: availableSlotsTitle,
                  description: availableSlotsDesc
                }
              ]
            }
          ]
        }
      }
    };
    
    const response = await whatsappService.sendRawMessage(mainMenuMessage);
    console.log('✅ Main menu message sent successfully');
    return response;
  } catch (error) {
    console.error('❌ Error sending main menu message:', error);
    throw error;
  }
}

/**
 * Sends WhatsApp Flow for booking process
 * @param {string} phoneNumber - Recipient's phone number
 * @returns {Promise<Object>} - API response
 */
async function sendBookingFlow(phoneNumber) {
  try {
    console.log('🔄 Sending booking flow...');
    
    // Generate a unique flow token
    const flowToken = `booking_${phoneNumber}_${Date.now()}`;
    
    // Save the flow token and phone number in the database for later use
    const FlowsState = require('../models/mysql/FlowsState');
    const flowState = await FlowsState.findOne({ phoneNumber }).sort({ updatedAt: -1 });
    if (flowState) {
      flowState.flowToken = flowToken;
      flowState.screen = 'booking_flow';
      await flowState.save();
    }
    
    const flowMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'flow',
        header: {
          type: 'text',
          text: 'Sports Booking'
        },
        body: {
          text: 'Please fill in your booking details'
        },
        footer: {
          text: 'Complete the form to proceed'
        },
        action: {
          name: 'flow',
          parameters: {
            flow_message_version: '3',
            flow_token: flowToken,
            flow_id: process.env.WHATSAPP_FLOW_ID || 'YOUR_FLOW_ID',
            flow_cta: 'Book Now',
            flow_action: 'INIT',
            flow_action_payload: {
              screen: 'BOOKING',
              data: {
                flow_token: flowToken,
                phone_number: phoneNumber
              }
            }
          }
        }
      }
    };
    
    const response = await whatsappService.sendRawMessage(flowMessage);
    console.log('✅ Booking flow sent successfully');
    return response;
  } catch (error) {
    console.error('❌ Error sending booking flow:', error);
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
  getBookingDetails,
  sendLanguageSelectionMessage,
  sendMainMenuMessage,
  sendBookingFlow
};