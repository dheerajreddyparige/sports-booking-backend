// src/util/flowDbUtils.js
const connectToDatabase = require('../utils/mysql-connection.js');
const FlowsState = require('../models/mysql/FlowsState');
const Booking = require('../models/mysql/Booking');
const Court = require('../models/mysql/Court');
const SportConfig = require('../models/mysql/SportConfig');
const slotUtils = require('./slotUtils');

// Add debug logging
console.log('🔍 Loading flowDbUtils.js module');

/**
 * Save or update flow state during WhatsApp interaction
 * @param {string} flowToken - Unique token for the flow session
 * @param {string} screen - Current screen name
 * @param {Object} data - User selections and input data
 */
async function saveFlowState(flowToken, screen, data) {
  console.log('💾 Saving flow state:', { flowToken, screen, data });
  await connectToDatabase();
  
  try {
    // Check if flow state exists
    const existingState = await FlowsState.findOne({ flowToken });
    
    // Extract specific fields from data to avoid storing unnecessary or duplicate information
    const {
      sport, 
      date, 
      duration, 
      time_slot, // snake_case in application
      name,
      phone,
      email,
      total_amount,
      original_amount,
      discount_info,
      is_date_enabled,
      is_duration_enabled,
      is_time_slots_enabled,
      is_footer_enabled,
      min_date,
      max_date,
      // Add other important fields here
      ...otherData
    } = data;
    
    // Prepare data for database (converting snake_case to camelCase)
    const dbData = {
      screen,
    };
    
    // Only add fields that are defined to avoid overwriting with undefined values
    if (sport !== undefined) dbData.sport = sport;
    if (date !== undefined) dbData.date = date;
    if (duration !== undefined) dbData.duration = duration;
    // Ensure time_slot is never null but an empty string instead
    if (time_slot !== undefined) dbData.timeSlot = time_slot === null ? "" : time_slot;
    
    // Add user details if available
    if (name !== undefined) dbData.name = name;
    if (phone !== undefined) dbData.phoneNumber = phone;
    if (email !== undefined) dbData.email = email;
    
    // Add pricing information if available - ensure they are strings
    if (total_amount !== undefined) dbData.totalAmount = total_amount === null ? "0" : total_amount.toString();
    if (original_amount !== undefined) dbData.originalAmount = original_amount === null ? "0" : original_amount.toString();
    if (discount_info !== undefined) dbData.discountInfo = discount_info;
    
    // Add UI state flags
    if (is_date_enabled !== undefined) dbData.isDateEnabled = is_date_enabled;
    if (is_duration_enabled !== undefined) dbData.isDurationEnabled = is_duration_enabled;
    if (is_time_slots_enabled !== undefined) dbData.isTimeSlotsEnabled = is_time_slots_enabled;
    if (is_footer_enabled !== undefined) dbData.isFooterEnabled = is_footer_enabled;
    
    // Add date range values
    if (min_date !== undefined) dbData.minDate = min_date;
    if (max_date !== undefined) dbData.maxDate = max_date;
    
    // Add any other data that doesn't conflict with our explicit mappings
    for (const [key, value] of Object.entries(otherData)) {
      // Skip properties that are already mapped or are undefined
      if (value === undefined) continue;
      
      // Convert snake_case to camelCase for database
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      dbData[camelKey] = value;
    }
    
    console.log('📊 Prepared database data:', dbData);
    
    if (existingState) {
      // Update existing flow state
      console.log('📝 Updating existing flow state');
      await FlowsState.update(existingState.id, dbData);
      
      // Return the updated flow state
      return await FlowsState.findOne({ flowToken });
    } else {
      // Create new flow state
      console.log('📝 Creating new flow state');
      
      // Make sure phoneNumber is set if phone is provided
      if (phone && !dbData.phoneNumber) {
        dbData.phoneNumber = phone;
      }
      
      // Make sure duration is properly set
      if (duration && !dbData.duration) {
        dbData.duration = duration;
      }
      
      // Ensure timeSlot is never null
      if (dbData.timeSlot === null || dbData.timeSlot === undefined) {
        dbData.timeSlot = "";
      }
      
      // Ensure originalAmount is never null
      if (dbData.originalAmount === null || dbData.originalAmount === undefined) {
        dbData.originalAmount = "0";
      }
      
      return await FlowsState.create({
        flowToken,
        ...dbData,
        processedMessages: [],
        updatedAt: new Date()
      });
    }
  } catch (error) {
    console.error('❌ Error saving flow state:', error);
    throw error;
  }
}

/**
 * Get saved flow state
 * @param {string} flowToken - Unique token for the flow session
 */
async function getFlowState(flowToken) {
  console.log('🔍 Getting flow state for token:', flowToken);
  await connectToDatabase();
  
  try {
    const state = await FlowsState.findOne({ flowToken });
    console.log('📋 Flow state retrieved:', state ? 'Found' : 'Not found');
    
    if (!state) return null;
    
    // Convert camelCase database fields to snake_case for application use
    const appState = {
      ...state,
      // Map specific fields we know about
      time_slot: state.timeSlot,
      phone: state.phoneNumber,
      total_amount: state.totalAmount,
      original_amount: state.originalAmount,
      discount_info: state.discountInfo,
      is_date_enabled: state.isDateEnabled,
      is_duration_enabled: state.isDurationEnabled,
      is_time_slots_enabled: state.isTimeSlotsEnabled,
      is_footer_enabled: state.isFooterEnabled,
      min_date: state.minDate,
      max_date: state.maxDate
    };
    
    // Ensure duration is properly converted
    if (state.duration !== undefined && state.duration !== null) {
      appState.duration = state.duration;
    }
    
    // Ensure phone is properly set
    if (state.phoneNumber !== undefined && state.phoneNumber !== null) {
      appState.phone = state.phoneNumber;
    }
    
    // Convert any other camelCase properties to snake_case
    for (const [key, value] of Object.entries(state)) {
      // Skip properties we've already explicitly mapped or that are null/undefined
      if (
        key === 'timeSlot' || 
        key === 'phoneNumber' || 
        key === 'totalAmount' || 
        key === 'originalAmount' || 
        key === 'discountInfo' ||
        key === 'isDateEnabled' ||
        key === 'isDurationEnabled' ||
        key === 'isTimeSlotsEnabled' ||
        key === 'isFooterEnabled' ||
        key === 'minDate' ||
        key === 'maxDate' ||
        key === 'duration' ||
        value === null ||
        value === undefined
      ) continue;
      
      // Check if this is a camelCase property that needs conversion
      if (/[a-z][A-Z]/.test(key)) {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
        appState[snakeKey] = value;
      }
    }
    
    console.log('📊 Converted state for application:', appState);
    return appState;
  } catch (error) {
    console.error('❌ Error retrieving flow state:', error);
    throw error;
  }
}

/**
 * Get available sports facilities from database
 * @returns {Array} Array of sports with their courts
 */
async function getSportsFacilities() {
  console.log('🔍 Getting sports facilities...');
  await connectToDatabase();
  
  try {
    // Default sports in case database fails
    const defaultSports = [
      { 
        id: 'badminton', 
        title: 'Badminton', 
        courts: [{id: 'badminton-1', title: 'Badminton Court 1'}],
        description: 'Indoor badminton courts with professional flooring',
        baseRate: 500
      }
    ];
    
    // Try to get courts from database
    const courts = await Court.find({ isActive: true });
    console.log(`📋 Found ${courts.length} active courts`);
    
    // If no courts found, return default sports
    if (!courts || courts.length === 0) {
      console.log('⚠️ No active courts found, using default sports facilities');
      return defaultSports;
    }
    
    // Group courts by sport
    const sportsFacilities = courts.reduce((acc, court) => {
      if (!acc[court.sport]) {
        acc[court.sport] = [];
      }
      acc[court.sport].push({
        id: court.sport + '-' + court.courtId,
        title: court.name
      });
      return acc;
    }, {});
    
    // Get sport configurations for base rates
    const sportConfigs = {};
    for (const sport of Object.keys(sportsFacilities)) {
      try {
        const config = await getSportConfig(sport);
        if (config) {
          sportConfigs[sport] = config;
        }
      } catch (error) {
        console.error(`❌ Error getting config for sport ${sport}:`, error);
      }
    }
    
    const formattedSports = Object.entries(sportsFacilities)
      .map(([sport, courts]) => ({
        id: sport,
        title: sport.charAt(0).toUpperCase() + sport.slice(1),
        courts: courts,
        description: sportConfigs[sport]?.description || `${sport.charAt(0).toUpperCase() + sport.slice(1)} court`,
        baseRate: sportConfigs[sport]?.baseRate || 500
      }));
    
    // If no sports were formatted, return default sports
    if (formattedSports.length === 0) {
      console.log('⚠️ No sports facilities available after formatting, using defaults');
      return defaultSports;
    }
    
    console.log(`✅ Returning ${formattedSports.length} sports facilities`);
    return formattedSports;
  } catch (error) {
    console.error('❌ Error getting sports facilities:', error);
    // Return default sports if database fails
    console.log('⚠️ Using default sports facilities due to error:', error.message);
    return [
      { 
        id: 'badminton', 
        title: 'Badminton', 
        courts: [{id: 'badminton-1', title: 'Badminton Court 1'}],
        description: 'Indoor badminton courts with professional flooring',
        baseRate: 500
      }
    ];
  }
}

/**
 * Get available dates (next 7 days)
 * @returns {Array} Array of date objects with id and title
 */
async function getAvailableDates() {
  const dates = [];
  
  for (let i = 0; i < 7; i++) {
    // Create date at noon to avoid timezone issues
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + i);
    
    // Format as YYYY-MM-DD ensuring we use local date
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const dateTitle = date.toLocaleDateString('en-US', options);
    
    dates.push({
      id: dateStr,
      title: dateTitle
    });
  }
  
  return dates;
}

/**
 * Get available time slots for a specific sport and date
 * @param {string} sport - Sport type (badminton, cricket, etc.)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} duration - Duration in hours
 * @returns {Object} Object containing time slots
 */
async function getAvailableTimeSlots(sport, date, duration) {
  console.log('🔍 Getting available time slots:', { sport, date, duration });
  await connectToDatabase();
  
  try {
    // Validate inputs
    if (!sport || !date || !duration) {
      console.error('❌ Missing required parameters for getAvailableTimeSlots:', { sport, date, duration });
      throw new Error('Missing required parameters: sport, date, or duration');
    }
    
    // Convert duration to number if it's a string
    const durationHours = typeof duration === 'string' ? parseFloat(duration) : duration;
    
    // Get sport configuration for operating hours
    const sportConfig = await getSportConfig(sport);
    if (!sportConfig) {
      console.error(`❌ Sport configuration not found for ${sport}`);
      throw new Error(`Sport configuration not found for ${sport}`);
    }
    
    console.log('📋 Sport configuration for time slots:', sportConfig.availableTimes);
    
    // Get existing bookings for this date and sport
    const bookings = await Booking.find({
      sport: sport,
      date: new Date(date),
      status: { $nin: ['cancelled', 'rejected'] }
    });
    
    console.log(`📋 Found ${bookings.length} existing bookings for ${date}`);
    
    // Get available courts for this sport
    const courts = await Court.find({ sport: sport, isActive: true });
    if (!courts || courts.length === 0) {
      console.error(`❌ No active courts found for sport: ${sport}`);
      throw new Error(`No active courts found for sport: ${sport}`);
    }
    
    console.log(`📋 Found ${courts.length} active courts for ${sport}`);
    
    // Get all possible time slots for this sport
    const openTime = sportConfig.availableTimes?.openTime || "05:00";
    const closeTime = sportConfig.availableTimes?.closeTime || "23:00";
    
    console.log(`⏰ Operating hours: ${openTime} - ${closeTime}`);
    
    // Generate all possible time slots
    const allSlots = generateTimeSlots(openTime, closeTime, durationHours);
    console.log(`⏰ Generated ${allSlots.length} possible time slots`);
    
    // Mark slots as unavailable if all courts are booked
    const availableSlots = allSlots.map(slot => {
      const [startHour, startMinute] = slot.id.split(':').map(Number);
      const startDateTime = new Date(date);
      startDateTime.setHours(startHour, startMinute, 0, 0);
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(startDateTime.getHours() + durationHours);
      
      // Check if all courts are booked for this time slot
      const conflictingBookings = bookings.filter(booking => {
        const bookingStart = new Date(booking.date);
        const [bStartHour, bStartMinute] = booking.startTime.split(':').map(Number);
        bookingStart.setHours(bStartHour, bStartMinute, 0, 0);
        
        const bookingEnd = new Date(bookingStart);
        bookingEnd.setHours(bookingStart.getHours() + booking.duration);
        
        // Check if booking overlaps with this slot
        return (
          (startDateTime < bookingEnd && endDateTime > bookingStart)
        );
      });
      
      // Slot is available if there are fewer conflicting bookings than courts
      const isAvailable = conflictingBookings.length < courts.length;
      
      return {
        ...slot,
        enabled: isAvailable
      };
    });
    
    // Filter to only available slots
    let filteredSlots = availableSlots.filter(slot => slot.enabled);
    
    // Sort slots by time
    filteredSlots.sort((a, b) => {
      const [aHour, aMinute] = a.id.split(':').map(Number);
      const [bHour, bMinute] = b.id.split(':').map(Number);
      return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
    });
    
    // For testing purposes, if no slots are available or there's an error, return all slots
    if (filteredSlots.length === 0) {
      console.log('⚠️ No available time slots found, returning all slots for testing');
      filteredSlots = allSlots;
    }
    
    // Format slots for display
    const formattedSlots = filteredSlots.map(slot => ({
      id: slot.id,
      title: slot.title
    }));
    
    // Create result object
    const result = {
      slots: formattedSlots
    };
    
    console.log(`✅ Returning ${formattedSlots.length} time slots`);
    return result;
  } catch (error) {
    console.error('❌ Error getting available time slots:', error);
    
    // For testing purposes, return default time slots
    console.log('⚠️ Returning default time slots due to error');
    
    // Generate default time slots from 6 AM to 10 PM at hourly intervals
    const defaultSlots = [];
    for (let hour = 6; hour <= 22; hour++) {
      const hourStr = hour.toString().padStart(2, '0');
      const nextHour = (hour + 1).toString().padStart(2, '0');
      
      const hour12 = hour % 12 || 12;
      const nextHour12 = (hour + 1) % 12 || 12;
      const amPm = hour < 12 ? 'AM' : 'PM';
      const nextAmPm = (hour + 1) < 12 ? 'AM' : 'PM';
      
      defaultSlots.push({
        id: `${hourStr}:00`,
        title: `${hour12}:00 ${amPm} - ${nextHour12}:00 ${nextAmPm}`
      });
    }
    
    return {
      slots: defaultSlots
    };
  }
}

/**
 * Helper function to generate time slots
 * @param {string} openTime - Opening time (HH:MM)
 * @param {string} closeTime - Closing time (HH:MM)
 * @param {number} duration - Duration in hours
 * @returns {Array} Array of time slots
 */
function generateTimeSlots(openTime, closeTime, duration) {
  console.log(`⏰ Generating time slots from ${openTime} to ${closeTime} with duration ${duration}h`);
  const slots = [];
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  
  // Convert to minutes for easier calculation
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  const durationMinutes = duration * 60;
  
  // Generate slots at 30-minute intervals
  for (let time = openMinutes; time <= closeMinutes - durationMinutes; time += 30) {
    const hour = Math.floor(time / 60);
    const minute = time % 60;
    
    const endTime = time + durationMinutes;
    const endHour = Math.floor(endTime / 60);
    const endMinute = endTime % 60;
    
    const startTimeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // Format time for display (12-hour format)
    const startHour12 = hour % 12 || 12;
    const startAmPm = hour < 12 ? 'AM' : 'PM';
    const endHour12 = endHour % 12 || 12;
    const endAmPm = endHour < 12 ? 'AM' : 'PM';
    
    const title = `${startHour12}:${minute.toString().padStart(2, '0')} ${startAmPm} - ${endHour12}:${endMinute.toString().padStart(2, '0')} ${endAmPm}`;
    
    slots.push({
      id: startTimeStr,
      title: title,
      enabled: true
    });
  }
  
  console.log(`⏰ Generated ${slots.length} time slots`);
  return slots;
}

/**
 * Get time slots for a specific sport, date and duration
 * @param {Object} params - Parameters including sport, date, and duration
 * @returns {Array} - Array of formatted time slots
 */
async function get_time_slots(params) {
  const { sport, date, duration } = params;
  
  if (!sport || !date || !duration) {
    console.error('❌ Missing required parameters for get_time_slots:', { sport, date, duration });
    return [];
  }
  
  console.log('🕒 Getting time slots with params:', { sport, date, duration });
  
  // Get available slots using the existing function
  const slots = await getAvailableTimeSlots(sport, date, duration);
  
  // Format for WhatsApp Flows ChipsSelector
  console.log(`✅ Returning ${slots.length} formatted time slots`);
  return slots;
}

/**
 * Create a booking from flow state
 * @param {Object} flowState - Flow state object
 * @returns {Object} Created booking
 */
async function createBookingFromFlow(flowState) {
  console.log('📝 Creating booking from flow state:', flowState);
  await connectToDatabase();
  
  try {
    // Validate required fields
    if (!flowState.sport || !flowState.time_slots || !flowState.date || !flowState.duration) {
      console.error('❌ Missing required booking fields:', { 
        sport: flowState.sport, 
        time_slots: flowState.time_slots, 
        date: flowState.date, 
        duration: flowState.duration 
      });
      throw new Error('Missing required booking fields: sport, time_slots, date, or duration');
    }
    
    // Extract sport
    const sport = flowState.sport;
    
    // Find an available court for this sport
    const courts = await Court.find({ sport, isActive: true });
    if (!courts || courts.length === 0) {
      throw new Error(`No available courts found for sport: ${sport}`);
    }
    
    // Find first available court
    let selectedCourt = null;
    for (const court of courts) {
      // Check if court is available for this time slot
      const isAvailable = await isCourtAvailable(
        court.courtId, 
        flowState.date, 
        flowState.time_slots, 
        flowState.duration
      );
      
      if (isAvailable) {
        selectedCourt = court;
        break;
      }
    }
    
    if (!selectedCourt) {
      throw new Error(`No available courts found for the selected time slot`);
    }
    
    // Parse time slot
    const startTime = flowState.time_slots;
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const durationHours = parseFloat(flowState.duration);
    
    // Calculate end time
    const endHourDecimal = startHour + durationHours;
    const endHour = Math.floor(endHourDecimal);
    const endMinute = startMinute + ((endHourDecimal - endHour) * 60);
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    
    // Calculate price
    const priceDetails = await calculatePrice(sport, durationHours, flowState.date, startTime);
    
    // Create a new booking
    const booking = new Booking({
      userId: flowState.userId || 'guest',
      sport,
      courtId: selectedCourt.courtId,
      date: new Date(flowState.date),
      startTime,
      endTime,
      duration: durationHours,
      amount: priceDetails.totalAmount,
      customerName: flowState.name || 'Guest',
      customerEmail: flowState.email || '',
      customerPhone: flowState.phone || '',
      specialRequirements: '',
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'razorpay',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await booking.save();
    console.log('✅ Booking created successfully:', booking._id);
    return booking;
  } catch (error) {
    console.error('❌ Error creating booking from flow:', error);
    throw error;
  }
}

/**
 * Check if a court is available for a specific time slot
 * @param {string} courtId - Court ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} startTime - Start time in HH:MM format
 * @param {number} duration - Duration in hours
 * @returns {boolean} True if court is available
 */
async function isCourtAvailable(courtId, date, startTime, duration) {
  try {
    // Convert duration to number if it's a string
    const durationHours = typeof duration === 'string' ? parseFloat(duration) : duration;
    
    // Parse start time
    const [startHour, startMinute] = startTime.split(':').map(Number);
    
    // Calculate end time
    const endHourDecimal = startHour + durationHours;
    const endHour = Math.floor(endHourDecimal);
    const endMinute = startMinute + ((endHourDecimal - endHour) * 60);
    const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    
    // Find conflicting bookings
    const bookings = await Booking.find({
      courtId: courtId,
      date: new Date(date),
      status: { $nin: ['cancelled', 'rejected'] }
    });
    
    // Check for conflicts
    for (const booking of bookings) {
      const bookingStart = booking.startTime;
      const bookingEnd = booking.endTime;
      
      // Check if booking overlaps with requested time
      if (
        (startTime < bookingEnd && endTimeStr > bookingStart)
      ) {
        return false; // Court is not available
      }
    }
    
    return true; // Court is available
  } catch (error) {
    console.error('❌ Error checking court availability:', error);
    return false; // Assume court is not available on error
  }
}

/**
 * Get sport configuration for a specific sport
 * @param {string} sport - Sport type (badminton, cricket, etc.)
 * @returns {Object} Sport configuration object
 */
async function getSportConfig(sport) {
  console.log(`🔍 Getting sport configuration for ${sport}...`);
  await connectToDatabase();
  
  try {
   
    
    // Get sport configuration from database
    const config = await SportConfig.findOne({ sport });
    
    if (!config) {
      console.log(`⚠️ No configuration found for ${sport}, using default`);
      return defaultConfig;
    }
    
    console.log(`✅ Found configuration for ${sport}`);
    return config;
  } catch (error) {
    console.error(`❌ Error getting sport configuration for ${sport}:`, error);
    
    // Return default configuration
    return {
      sport: sport,
      baseRate: sport === 'cricket' ? 1200 : sport === 'pickleball' ? 400 : 500,
      pricingRates: {
        weekday: {
          morning: sport === 'cricket' ? 1200 : sport === 'pickleball' ? 400 : 500,
          evening: sport === 'cricket' ? 1500 : sport === 'pickleball' ? 500 : 625
        },
        weekend: {
          morning: sport === 'cricket' ? 1500 : sport === 'pickleball' ? 500 : 625,
          evening: sport === 'cricket' ? 1800 : sport === 'pickleball' ? 600 : 750
        }
      },
      timePeriods: {
        morning: {
          startTime: '05:00',
          endTime: '17:00'
        },
        evening: {
          startTime: '17:00',
          endTime: '23:00'
        }
      },
      discounts: {
        twoHour: 5,
        threeHour: 10,
        fourHour: 15
      },
      availableTimes: {
        openTime: '05:00',
        closeTime: '23:00'
      },
      maxBookingDays: 7,
      description: `${sport.charAt(0).toUpperCase() + sport.slice(1)} court`,
      imageUrl: null
    };
  }
}

/**
 * Calculate price based on sport, duration and apply any bulk booking discounts
 * @param {String} sport - Selected sport
 * @param {Number} duration - Selected duration in hours
 * @returns {Object} - Price details including original amount and discount info
 */
const calculatePriceHelper = (sport, duration) => {
  // Base prices per sport per hour
  const basePrices = {
    'badminton': 400,
    'cricket': 1200,
    'pickleball': 350,
    'tennis': 600,
    'football': 1500,
    // Add more sports as needed
  };

  // Default price if sport not found
  const basePrice = basePrices[sport.toLowerCase()] || 500;
  console.log(`💰 Base price for ${sport}: ₹${basePrice}/hr`);
  
  // Calculate original amount (duration * base price)
  const originalAmount = basePrice * duration;
  console.log(`💰 Original amount for ${duration} hours: ₹${originalAmount}`);
  
  let discountPercent = 0;
  let discountInfo = '';
  
  // Apply bulk booking discounts based on duration
  if (duration >= 4) {
    discountPercent = 15;
    discountInfo = `15% bulk booking discount`;
  } else if (duration >= 3) {
    discountPercent = 10;
    discountInfo = `10% bulk booking discount`;
  } else if (duration >= 2) {
    discountPercent = 5;
    discountInfo = `5% bulk booking discount`;
  }
  
  // Calculate discounted amount
  const discountAmount = (originalAmount * discountPercent) / 100;
  const finalAmount = Math.round(originalAmount - discountAmount);
  
  // Format discount info if applicable
  if (discountPercent > 0) {
    console.log(`💰 Applied ${discountPercent}% discount: -₹${discountAmount}`);
    console.log(`💰 Final amount: ₹${finalAmount}`);
  } else {
    console.log(`💰 No discount applied. Final amount: ₹${originalAmount}`);
  }
  
  return {
    originalAmount: Math.round(originalAmount).toString(),
    discountAmount: Math.round(discountAmount).toString(),
    finalAmount: (discountPercent > 0 ? finalAmount : Math.round(originalAmount)).toString(),
    discountPercent,
    discountInfo
  };
};

/**
 * Create or update a customer record
 * @param {Object} customerData - Customer data
 * @returns {Promise<Object>} Created or updated customer
 */
async function createOrUpdateCustomer(customerData) {
  console.log('🔄 Creating or updating customer:', customerData);
  await connectToDatabase();
  
  try {
    const pool = await connectToDatabase();
    
    // Check if customer exists by phone number
    const [existingCustomers] = await pool.query(
      'SELECT * FROM customers WHERE phone = ? LIMIT 1',
      [customerData.phone]
    );
    
    if (existingCustomers && existingCustomers.length > 0) {
      // Update existing customer
      const customer = existingCustomers[0];
      console.log('✅ Found existing customer:', customer.id);
      
      // Update fields that are provided
      const updates = [];
      const params = [];
      
      if (customerData.name) {
        updates.push('name = ?');
        params.push(customerData.name);
      }
      
      if (customerData.email) {
        updates.push('email = ?');
        params.push(customerData.email);
      }
      
      if (customerData.whatsappId) {
        updates.push('whatsapp_id = ?');
        params.push(customerData.whatsappId);
      }
      
      // Only update if there are fields to update
      if (updates.length > 0) {
        params.push(customer.id);
        await pool.query(
          `UPDATE customers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
          params
        );
        console.log('✅ Customer updated successfully');
      }
      
      // Return the updated customer
      const [updatedCustomers] = await pool.query(
        'SELECT * FROM customers WHERE id = ?',
        [customer.id]
      );
      
      return updatedCustomers[0];
    } else {
      // Create new customer
      console.log('🆕 Creating new customer');
      
      // Check if the customers table has the required columns
      try {
        const [columns] = await pool.query('DESCRIBE customers');
        const columnNames = columns.map(col => col.Field);
        
        console.log('Available columns in customers table:', columnNames.join(', '));
        
        // Create a dynamic query based on available columns
        const availableColumns = [];
        const placeholders = [];
        const values = [];
        
        // Map customer data to available columns
        if (columnNames.includes('name')) {
          availableColumns.push('name');
          placeholders.push('?');
          values.push(customerData.name || '');
        }
        
        if (columnNames.includes('phone')) {
          availableColumns.push('phone');
          placeholders.push('?');
          values.push(customerData.phone || '');
        }
        
        if (columnNames.includes('email')) {
          availableColumns.push('email');
          placeholders.push('?');
          values.push(customerData.email || '');
        }
        
        if (columnNames.includes('whatsapp_id')) {
          availableColumns.push('whatsapp_id');
          placeholders.push('?');
          // Use empty string instead of null for whatsapp_id
          values.push(customerData.whatsappId || '');
        }
        
        if (columnNames.includes('customer_id') && customerData.phone) {
          availableColumns.push('customer_id');
          placeholders.push('?');
          values.push(`cust_${Date.now()}_${customerData.phone.substring(0, 4)}`);
        }
        
        // Only proceed if we have columns to insert
        if (availableColumns.length > 0) {
          const [result] = await pool.query(
            `INSERT INTO customers (${availableColumns.join(', ')}) VALUES (${placeholders.join(', ')})`,
            values
          );
          
          console.log('✅ New customer created with ID:', result.insertId);
          
          // Return the created customer
          const [newCustomers] = await pool.query(
            'SELECT * FROM customers WHERE id = ?',
            [result.insertId]
          );
          
          return newCustomers[0];
        } else {
          console.log('⚠️ No matching columns found in customers table, skipping customer creation');
          return null;
        }
      } catch (error) {
        console.error('❌ Error checking customers table structure:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Error creating/updating customer:', error);
    // Return null instead of throwing to prevent flow interruption
    return null;
  }
}

/**
 * Get customer by phone number
 * @param {string} phoneNumber - Customer phone number
 * @returns {Promise<Object|null>} Customer object or null if not found
 */
async function getCustomerByPhone(phoneNumber) {
  console.log('🔍 Looking up customer by phone:', phoneNumber);
  await connectToDatabase();
  
  try {
    const pool = await connectToDatabase();
    
    // Query to find customer by phone number
    const [customers] = await pool.query(
      'SELECT * FROM customers WHERE phone = ? LIMIT 1',
      [phoneNumber]
    );
    
    if (customers && customers.length > 0) {
      console.log('✅ Found customer:', customers[0].id);
      
      // Format customer data
      const customer = customers[0];
      return {
        id: customer.id,
        name: customer.first_name + (customer.last_name ? ' ' + customer.last_name : ''),
        phone: customer.phone,
        email: customer.email,
        whatsappId: customer.whatsapp_id,
        isActive: !!customer.is_active,
        isVerified: !!customer.is_verified
      };
    }
    
    console.log('ℹ️ No customer found with phone number:', phoneNumber);
    return null;
  } catch (error) {
    console.error('❌ Error looking up customer by phone:', error);
    return null;
  }
}

/**
 * Validate a coupon code and calculate the discount
 * @param {string} couponCode - The coupon code to validate
 * @param {string} sport - The sport type for sport-specific coupons
 * @returns {Object} Validation result with discount information
 */
async function validateCoupon(couponCode, sport) {
  console.log(`🎟️ Validating coupon: ${couponCode} for sport: ${sport}`);
  await connectToDatabase();
  
  try {
    const pool = await connectToDatabase();
    
    // Get current date for validity check
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split('T')[0];
    
    // Query to find valid coupon
    const [coupons] = await pool.query(
      `SELECT * FROM coupons 
       WHERE code = ? 
       AND is_active = 1 
       AND (valid_until IS NULL OR valid_until >= ?) 
       AND (valid_from IS NULL OR valid_from <= ?)
       AND (usage_limit IS NULL OR usage_count < usage_limit)`,
      [couponCode, formattedDate, formattedDate]
    );
    
    if (!coupons || coupons.length === 0) {
      console.log('❌ Coupon not found or expired:', couponCode);
      return {
        valid: false,
        message: "Invalid or expired coupon code"
      };
    }
    
    const coupon = coupons[0];
    
    // Check if coupon is sport-specific
    if (coupon.applicable_sports) {
      const applicableSports = coupon.applicable_sports.split(',').map(s => s.trim().toLowerCase());
      
      if (!applicableSports.includes(sport.toLowerCase())) {
        console.log('❌ Coupon not valid for this sport:', { couponSports: applicableSports, requestedSport: sport });
        return {
          valid: false,
          message: `This coupon is not valid for ${sport}`
        };
      }
    }
    
    // Valid coupon found
    console.log('✅ Valid coupon found:', coupon);
    
    // Determine discount type and value
    const discountType = coupon.discount_type || 'percentage';
    const discountValue = coupon.discount_value || 10;
    
    // Increment usage count
    await pool.query(
      'UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?',
      [coupon.id]
    );
    
    return {
      valid: true,
      type: discountType,
      value: discountValue,
      code: couponCode,
      name: coupon.name || couponCode,
      description: coupon.description || `${discountValue}% off`
    };
  } catch (error) {
    console.error('❌ Error validating coupon:', error);
    return {
      valid: false,
      message: "Error validating coupon"
    };
  }
}

/**
 * Format customer details with proper formatting for summary screen
 * @param {Object} data - Flow data object
 * @returns {String} - Formatted customer details string
 */
const formatCustomerDetails = (data) => {
  return `**Customer:** ${data.name || 'N/A'}\n**Phone:** ${data.phone || 'N/A'}\n**Email:** ${data.email || 'N/A'}`;
};

/**
 * Format booking details with proper formatting for summary screen
 * @param {Object} data - Flow data object
 * @returns {String} - Formatted booking details string
 */
const formatBookingDetails = (data) => {
  // Ensure duration has a value and is properly formatted
  const duration = data.duration ? parseFloat(data.duration) : 1;
  const formattedDuration = isNaN(duration) ? "1" : duration.toString();
  
  // Format time slot with a default value if missing
  const timeSlot = data.time_slot || "N/A";
  
  // Ensure total amount has a value and is properly formatted
  const totalAmount = data.total_amount ? parseFloat(data.total_amount) : 0;
  const formattedAmount = isNaN(totalAmount) ? "0" : totalAmount.toString();
  
  return `**Sport:** ${data.sport || 'N/A'}\n**Date:** ${data.date || 'N/A'}\n**Duration:** ${formattedDuration} Hour(s)\n**Time Slot:** ${timeSlot}\n**Total Amount:** ₹${formattedAmount}${data.discount_info ? '\n' + data.discount_info : ''}`;
};

/**
 * Format price difference details for coupon application
 * @param {Object} data - Flow data object
 * @returns {String} - Formatted price difference string
 */
const formatPriceDifference = (data) => {
  // Ensure original amount has a value and is properly formatted
  const originalAmount = data.original_amount ? parseFloat(data.original_amount) : 0;
  const formattedOriginalAmount = isNaN(originalAmount) ? "0" : originalAmount.toString();
  
  return `**Original Price:** ₹${formattedOriginalAmount}\n**Discount Applied:** ${data.discount_info || 'No discount'}`;
};

/**
 * Generate time slots based on sport, date and duration
 * @param {String} sport - Selected sport
 * @param {String} date - Selected date
 * @param {Number} duration - Selected duration in hours
 * @returns {Array} - Array of available time slots
 */
const generateTimeSlotsHelper = (sport, date, duration) => {
  // Convert duration to a number if it's a string
  const durationNum = parseFloat(duration);
  
  // Sample time slots (in real implementation, this would come from a database)
  const operatingHours = {
    start: 5, // 5 AM
    end: 22,  // 10 PM
  };
  
  const slots = [];
  const interval = 0.5; // 30-minute intervals
  
  // Generate all possible time slots based on operating hours and duration
  for (let hour = operatingHours.start; hour <= operatingHours.end - durationNum; hour += interval) {
    const startHour = Math.floor(hour);
    const startMinute = (hour % 1) * 60;
    
    const endHour = Math.floor(hour + durationNum);
    const endMinute = ((hour + durationNum) % 1) * 60;
    
    // Format start and end times
    const startTime = formatTime(startHour, startMinute);
    const endTime = formatTime(endHour, endMinute);
    
    // Create slot object
    const slot = {
      id: `${startTime}-${endTime}`,
      title: `${startTime} - ${endTime}`
    };
    
    slots.push(slot);
  }
  
  // In a real implementation, filter out already booked slots based on date
  // This would involve checking a database for existing bookings
  
  return slots;
};

/**
 * Format time in 12-hour format (e.g., "5:00 AM")
 * @param {Number} hour - Hour (0-23)
 * @param {Number} minute - Minute (0-59)
 * @returns {String} - Formatted time string
 */
const formatTime = (hour, minute) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  const minuteStr = minute === 0 ? '00' : minute;
  return `${hour12}:${minuteStr} ${period}`;
};

/**
 * Validate coupon code and calculate discount
 * @param {String} couponCode - Coupon code to validate
 * @param {Number} amount - Original amount before coupon
 * @returns {Object} - Validation result with discount details
 */
const validateCouponHelper = (couponCode, amount) => {
  // Sample coupon codes (in real implementation, this would come from a database)
  const validCoupons = {
    'WELCOME10': { discount: 10, type: 'percent', maxDiscount: 200 },
    'FLAT100': { discount: 100, type: 'fixed' },
    'SUMMER25': { discount: 25, type: 'percent', minAmount: 1000 },
  };
  
  // Default response for invalid coupon
  const invalidResponse = {
    valid: false,
    couponError: 'Invalid coupon code',
    discountAmount: 0,
    finalAmount: amount
  };
  
  // Check if coupon exists
  if (!couponCode || !validCoupons[couponCode.toUpperCase()]) {
    return invalidResponse;
  }
  
  const coupon = validCoupons[couponCode.toUpperCase()];
  
  // Check minimum amount requirement if applicable
  if (coupon.minAmount && amount < coupon.minAmount) {
    return {
      valid: false,
      couponError: `Minimum order amount of ₹${coupon.minAmount} required`,
      discountAmount: 0,
      finalAmount: amount
    };
  }
  
  // Calculate discount amount
  let discountAmount = 0;
  if (coupon.type === 'percent') {
    discountAmount = (amount * coupon.discount) / 100;
    // Apply maximum discount limit if applicable
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  } else if (coupon.type === 'fixed') {
    discountAmount = coupon.discount;
  }
  
  // Calculate final amount
  const finalAmount = Math.max(0, amount - discountAmount);
  
  // Format discount info
  const discountInfo = coupon.type === 'percent' 
    ? `**Coupon Discount:** ${coupon.discount}% (₹${discountAmount.toFixed(2)})`
    : `**Coupon Discount:** ₹${discountAmount.toFixed(2)}`;
  
  return {
    valid: true,
    couponCode: couponCode.toUpperCase(),
    discountAmount: discountAmount.toFixed(2),
    finalAmount: finalAmount.toFixed(2),
    discountInfo
  };
};

/**
 * Create a new booking in the database
 * @param {Object} bookingData - Booking data
 * @returns {Promise<string>} Booking ID
 */
async function createBooking(bookingData) {
  console.log('📝 Creating new booking with data:', bookingData);
  await connectToDatabase();
  
  try {
    const pool = await connectToDatabase();
    
    // Generate a unique booking ID
    const bookingId = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // Parse date from string to Date object if needed
    let bookingDate = bookingData.date;
    if (typeof bookingDate === 'string') {
      bookingDate = new Date(bookingDate);
    }
    
    // Extract time slot start time
    const startTime = bookingData.time_slot.split('-')[0].trim();
    
    // Calculate end time based on duration
    const [startHour, startMinute] = startTime.replace(/\s*(?:AM|PM)/, '').split(':').map(Number);
    const duration = parseFloat(bookingData.duration);
    
    // Calculate end time in hours and minutes
    let endHour = startHour + Math.floor(duration);
    let endMinute = startMinute + ((duration % 1) * 60);
    
    // Adjust for minute overflow
    if (endMinute >= 60) {
      endHour += 1;
      endMinute -= 60;
    }
    
    // Format end time
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    
    // Prepare data for insertion
    const insertData = {
      sport: bookingData.sport,
      court_id: 0, // Default court ID
      date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      duration: duration,
      customer_name: bookingData.customer_name,
      customer_email: bookingData.customer_email,
      customer_phone: bookingData.customer_phone,
      status: bookingData.status || 'pending',
      amount: bookingData.amount,
      currency: 'INR',
      payment_status: 'pending',
      flow_token: bookingData.flow_token || null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Create the SQL query with specific fields
    const fields = Object.keys(insertData);
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map(field => insertData[field]);
    
    const query = `
      INSERT INTO bookings (${fields.join(', ')})
      VALUES (${placeholders})
    `;
    
    // Execute the query
    const [result] = await pool.query(query, values);
    
    // Store the booking ID in notes field for reference
    await pool.query(
      'UPDATE bookings SET notes = ? WHERE id = ?',
      [bookingId, result.insertId]
    );
    
    console.log(`✅ Booking created successfully with ID: ${bookingId}`);
    return bookingId;
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    throw error;
  }
}

/**
 * Update an existing booking with payment information
 * @param {string} bookingId - Booking ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated booking
 */
async function updateBooking(bookingId, updateData) {
  console.log(`🔄 Updating booking ${bookingId} with payment information...`);
  await connectToDatabase();
  
  try {
    const pool = await connectToDatabase();
    
    // Check if booking exists using notes field which contains the booking ID
    const [bookings] = await pool.query(
      'SELECT * FROM bookings WHERE notes = ? LIMIT 1',
      [bookingId]
    );
    
    if (!bookings || bookings.length === 0) {
      throw new Error(`Booking not found with ID: ${bookingId}`);
    }
    
    // Prepare update fields and values
    const updateFields = [];
    const updateValues = [];
    
    // Map fields to database columns
    if (updateData.upi_link) {
      updateFields.push('payment_receipt = ?');
      updateValues.push(updateData.upi_link);
    }
    
    if (updateData.invoice_url) {
      updateFields.push('payment_receipt = ?');
      updateValues.push(updateData.invoice_url);
    }
    
    if (updateData.razorpay_order_id) {
      updateFields.push('transaction_id = ?');
      updateValues.push(updateData.razorpay_order_id);
    }
    
    if (updateData.payment_method) {
      updateFields.push('payment_method = ?');
      // Map payment method to enum values
      const paymentMethodMap = {
        'upi': 'razorpay',
        'razorpay': 'razorpay',
        'paytm': 'paytm',
        'cash': 'cash'
      };
      updateValues.push(paymentMethodMap[updateData.payment_method] || 'razorpay');
    }
    
    if (updateData.payment_status) {
      updateFields.push('payment_status = ?');
      updateValues.push(updateData.payment_status);
    }
    
    if (updateData.status) {
      updateFields.push('status = ?');
      updateValues.push(updateData.status);
    }
    
    // Add payment initiated timestamp
    updateFields.push('payment_initiated_at = NOW()');
    
    // Add updated_at timestamp
    updateFields.push('updated_at = NOW()');
    
    // Only proceed if there are fields to update
    if (updateFields.length > 0) {
      // Add booking ID to values
      updateValues.push(bookingId);
      
      // Execute update query
      const query = `
        UPDATE bookings
        SET ${updateFields.join(', ')}
        WHERE notes = ?
      `;
      
      await pool.query(query, updateValues);
      console.log(`✅ Booking ${bookingId} updated successfully`);
      
      // Return updated booking
      const [updatedBookings] = await pool.query(
        'SELECT * FROM bookings WHERE notes = ? LIMIT 1',
        [bookingId]
      );
      
      return updatedBookings[0];
    } else {
      console.log(`ℹ️ No fields to update for booking ${bookingId}`);
      return bookings[0];
    }
  } catch (error) {
    console.error(`❌ Error updating booking ${bookingId}:`, error);
    throw error;
  }
}

/**
 * Generate UPI payment link according to WhatsApp Cloud API requirements
 * @param {Object} bookingData - Booking data
 * @returns {string} UPI payment link
 */
function generateUpiPaymentLink(bookingData) {
  // Get UPI configuration from environment variables or use defaults
  const upiId = process.env.UPI_ID || "dheeraj@upi";
  const merchantName = encodeURIComponent(process.env.MERCHANT_NAME || "PitZone Sports");
  const referenceId = bookingData.bookingId || `order_${Date.now()}`;
  
  // Format amount to have exactly 2 decimal places
  const amount = parseFloat(bookingData.amount).toFixed(2);
  
  // Create a descriptive transaction note
  const description = encodeURIComponent(`Booking for ${bookingData.sport} on ${bookingData.date} at ${bookingData.time_slot}`);
  
  // Required parameters for UPI intent
  const merchantCategoryCode = process.env.MERCHANT_CATEGORY_CODE || "0000"; // Merchant Category Code
  const purposeCode = process.env.PURPOSE_CODE || "00"; // Purpose Code for merchant payments
  const currency = "INR";
  
  // Optional parameters for better compatibility
  const mode = "00"; // UPI intent mode
  
  // Construct UPI link according to NPCI specifications and WhatsApp Cloud API requirements
  // Format: upi://pay?pa=UPI_ID&pn=NAME&tr=REFERENCE_ID&am=AMOUNT&cu=CURRENCY&mc=MERCHANT_CODE&purpose=PURPOSE_CODE&tn=DESCRIPTION
  const upiLink = `upi://pay?pa=${upiId}&pn=${merchantName}&tr=${referenceId}&am=${amount}&cu=${currency}&mc=${merchantCategoryCode}&purpose=${purposeCode}&mode=${mode}&tn=${description}`;
  
  console.log('🔗 Generated UPI payment link:', upiLink);
  return upiLink;
}

/**
 * Generate Razorpay payment link
 * @param {Object} bookingData - Booking data
 * @returns {Promise<string>} Razorpay payment link
 */
async function generateRazorpayLink(bookingData) {
  try {
    // Check if Razorpay credentials are available
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      console.log('⚠️ Razorpay credentials not found, generating mock link');
      return `https://rzp.io/i/mock/${bookingData.bookingId || Date.now()}`;
    }
    
    // Initialize Razorpay
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
    
    // Create Razorpay order
    const amount = Math.round(parseFloat(bookingData.amount) * 100); // Convert to paise
    const order = await razorpay.orders.create({
      amount: amount,
      currency: "INR",
      receipt: `receipt_${bookingData.bookingId || Date.now()}`,
      notes: {
        booking_id: bookingData.bookingId,
        sport: bookingData.sport,
        date: bookingData.date,
        time_slot: bookingData.time_slot,
        customer_name: bookingData.customer_name,
        customer_email: bookingData.customer_email,
        customer_phone: bookingData.customer_phone
      }
    });
    
    // Create a payment link
    const paymentLink = await razorpay.paymentLink.create({
      amount: amount,
      currency: "INR",
      accept_partial: false,
      description: `Booking for ${bookingData.sport} on ${bookingData.date}`,
      customer: {
        name: bookingData.customer_name,
        email: bookingData.customer_email,
        contact: bookingData.customer_phone
      },
      notify: {
        sms: true,
        email: true
      },
      reminder_enable: true,
      notes: {
        booking_id: bookingData.bookingId,
        sport: bookingData.sport,
        date: bookingData.date,
        time_slot: bookingData.time_slot
      },
      callback_url: `${process.env.BASE_URL || 'https://pitzone-sports.com'}/api/payment/callback?booking_id=${bookingData.bookingId}`,
      callback_method: 'get'
    });
    
    console.log('✅ Razorpay payment link created:', paymentLink.short_url);
    return paymentLink.short_url;
  } catch (error) {
    console.error('❌ Error creating Razorpay payment link:', error);
    return `https://rzp.io/i/error/${bookingData.bookingId || Date.now()}`;
  }
}

module.exports = {
  saveFlowState,
  getFlowState,
  getSportsFacilities,
  getAvailableDates,
  getAvailableTimeSlots,
  getSportConfig,
  calculatePriceHelper,
  createBookingFromFlow,
  get_time_slots,
  createOrUpdateCustomer,
  getCustomerByPhone,
  validateCoupon,
  formatCustomerDetails,
  formatBookingDetails,
  formatPriceDifference,
  generateTimeSlotsHelper,
  formatTime,
  validateCouponHelper,
  updateBooking,
  createBooking,
  generateUpiPaymentLink,
  generateRazorpayLink
};