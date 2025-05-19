// src/util/flowDbUtils.js
const connectToDatabase = require('./connect-to-database');
const FlowsState = require('../models/FlowsState');
const Booking = require('../models/Booking');
const Court = require('../models/Court').default;
const SportConfig = require('../models/SportConfig');
const slotUtils = require('./slotUtils');

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
    // Update if exists, create if not
    const result = await FlowsState.findOneAndUpdate(
      { flowToken },
      { 
        flowToken,
        screen,
        ...data,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    console.log('✅ Flow state saved successfully');
    return result;
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
    return state;
  } catch (error) {
    console.error('❌ Error retrieving flow state:', error);
    throw error;
  }
}

/**
 * Get available sports facilities
 */
async function getSportsFacilities() {
  console.log('🔍 Getting sports facilities...');
  await connectToDatabase();
  
  try {
    const courts = await Court.find({ isActive: true });
    console.log(`📋 Found ${courts.length} active courts`);
    
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
    
    // Format for WhatsApp Flows
    return Object.entries(sportsFacilities).map(([sport, courts]) => ({
      id: sport,
      title: sport.charAt(0).toUpperCase() + sport.slice(1),
      courts: courts
    }));
  } catch (error) {
    console.error('❌ Error getting sports facilities:', error);
    // Return default sports if database fails
    console.log('⚠️ Using default sports facilities');
    return [
      { id: 'badminton', title: 'Badminton', courts: [{id: 'badminton-1', title: 'Badminton Court 1'}] },
      { id: 'cricket', title: 'Cricket', courts: [{id: 'cricket-1', title: 'Cricket Ground'}] },
      { id: 'pickleball', title: 'Pickleball', courts: [{id: 'pickleball-1', title: 'Pickleball Court'}] }
    ];
  }
}

/**
 * Get available dates (next 7 days)
 */
async function getAvailableDates() {
  const dates = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
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
 * @param {string} duration - Duration in hours
 * @param {string} timeOfDay - Optional: "morning" or "evening"
 */
const getAvailableTimeSlots = async (sport, date, duration, timeOfDay) => {
  console.log('🔍 Getting available time slots:', { sport, date, duration, timeOfDay });
  try {
    const slots = await slotUtils.getAvailableSlots(sport, date, duration);
    
    // Filter slots based on time of day if specified
    let filteredSlots = slots.filter(slot => slot.enabled);
    
    if (timeOfDay) {
      if (timeOfDay === "morning") {
        // Morning slots (5:00 AM - 11:59 AM)
        filteredSlots = filteredSlots.filter(slot => {
          const hour = parseInt(slot.id.split(':')[0], 10);
          return hour >= 5 && hour < 12;
        });
      } else if (timeOfDay === "afternoon") {
        // Afternoon slots (12:00 PM - 4:59 PM)
        filteredSlots = filteredSlots.filter(slot => {
          const hour = parseInt(slot.id.split(':')[0], 10);
          return hour >= 12 && hour < 17;
        });
      } else if (timeOfDay === "evening") {
        // Evening slots (5:00 PM - 11:59 PM)
        filteredSlots = filteredSlots.filter(slot => {
          const hour = parseInt(slot.id.split(':')[0], 10);
          return hour >= 17;
        });
      }
    }
    
    // Limit to 20 options per time of day
    const formattedSlots = filteredSlots.slice(0, 20).map(slot => ({
      id: slot.id,
      title: slot.title
    }));
    
    // Ensure we have at least 2 slots (WhatsApp Flow requirement)
    if (formattedSlots.length < 2) {
      if (timeOfDay === "morning") {
        return [
          { id: "09:00", title: "9:00 AM - 10:00 AM" },
          { id: "10:00", title: "10:00 AM - 11:00 AM" }
        ];
      } else if (timeOfDay === "evening") {
        return [
          { id: "17:00", title: "5:00 PM - 6:00 PM" },
          { id: "18:00", title: "6:00 PM - 7:00 PM" }
        ];
      } else {
        return [
          { id: "09:00", title: "9:00 AM - 10:00 AM" },
          { id: "17:00", title: "5:00 PM - 6:00 PM" }
        ];
      }
    }
    
    return formattedSlots;
  } catch (error) {
    console.error('❌ Error in getAvailableTimeSlots:', error);
    // Return default slots based on time of day
    if (timeOfDay === "morning") {
      return [
        { id: "09:00", title: "9:00 AM - 10:00 AM" },
        { id: "10:00", title: "10:00 AM - 11:00 AM" }
      ];
    } else if (timeOfDay === "afternoon") {
      return [
        { id: "13:00", title: "1:00 PM - 2:00 PM" },
        { id: "15:00", title: "3:00 PM - 4:00 PM" }
      ];
    } else if (timeOfDay === "evening") {
      return [
        { id: "17:00", title: "5:00 PM - 6:00 PM" },
        { id: "18:00", title: "6:00 PM - 7:00 PM" }
      ];
    } else {
      return [
        { id: "09:00", title: "9:00 AM - 10:00 AM" },
        { id: "13:00", title: "1:00 PM - 2:00 PM" },
        { id: "17:00", title: "5:00 PM - 6:00 PM" }
      ];
    }
  }
};

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
    
    // Extract sport (no longer combined with courtId in new structure)
    const sport = flowState.sport;
    
    // Find an available court for this sport
    const courts = await Court.find({ sport, isActive: true });
    if (!courts || courts.length === 0) {
      throw new Error(`No available courts found for sport: ${sport}`);
    }
    const courtId = courts[0].courtId; // Use the first available court
    
    // Parse time slot (format: "10:00-11:30")
    const timeSlotParts = flowState.time_slots.split('-');
    const startTime = timeSlotParts[0];
    const endTime = timeSlotParts[1];
    
    // Alternative calculation if time_slots doesn't contain end time
    // const startTime = flowState.time_slots;
    // const [startHour, startMinute] = startTime.split(':').map(Number);
    // const durationHours = parseFloat(flowState.duration);
    // const endHourDecimal = startHour + durationHours;
    // const endHour = Math.floor(endHourDecimal);
    // const endMinute = startMinute + ((endHourDecimal - endHour) * 60);
    // const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    
    // Create a new booking
    const booking = new Booking({
      userId: flowState.userId || 'guest',
      sport,
      courtId,
      date: new Date(flowState.date),
      startTime,
      endTime,
      duration: parseFloat(flowState.duration),
      amount: parseFloat(flowState.total_amount || 0),
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
    return booking;
  } catch (error) {
    console.error('❌ Error creating booking from flow:', error);
    throw error;
  }
}

/**
 * Get sport configuration by sport type
 * @param {string} sport - Sport type (badminton, cricket, pickleball)
 */
async function getSportConfig(sport) {
  console.log(`🔍 Getting configuration for sport: ${sport}`);
  await connectToDatabase();
  
  try {
    const config = await SportConfig.findOne({ sport, isActive: true });
    
    if (config) {
      console.log(`✅ Found configuration for ${sport}`);
      return config;
    } else {
      console.log(`⚠️ No configuration found for ${sport}, using defaults`);
      // Return default configuration
      return {
        sport,
        baseRate: sport === 'cricket' ? 600 : sport === 'pickleball' ? 350 : 400,
        discounts: {
          twoHour: 5,
          threeHour: 10,
          fourHour: 15
        },
        availableTimes: {
          openTime: "05:00",
          closeTime: "23:00"
        },
        maxBookingDays: 7
      };
    }
  } catch (error) {
    console.error(`❌ Error getting sport configuration for ${sport}:`, error);
    // Return default configuration on error
    return {
      sport,
      baseRate: sport === 'cricket' ? 600 : sport === 'pickleball' ? 350 : 400,
      discounts: {
        twoHour: 5,
        threeHour: 10,
        fourHour: 15
      },
      availableTimes: {
        openTime: "05:00",
        closeTime: "23:00"
      },
      maxBookingDays: 7
    };
  }
}

/**
 * Calculate price for a booking based on sport, duration, date, and time
 * @param {string} sport - Sport type
 * @param {string} duration - Duration in hours
 * @param {string} date - Booking date (YYYY-MM-DD format)
 * @param {string} startTime - Booking start time (HH:MM format)
 */
async function calculatePrice(sport, duration, date, startTime) {
  console.log(`💰 Calculating price for ${sport}, duration: ${duration}, date: ${date}, time: ${startTime}`);
  
  try {
    const config = await getSportConfig(sport);
    const durationHours = parseFloat(duration);
    
    // Determine if booking is on a weekend
    const bookingDate = date ? new Date(date) : new Date();
    const dayOfWeek = bookingDate.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Determine if booking is in morning or evening
    const bookingHour = startTime ? parseInt(startTime.split(':')[0], 10) : new Date().getHours();
    const morningStartHour = parseInt(config.timePeriods?.morning?.startTime?.split(':')[0] || '05', 10);
    const eveningStartHour = parseInt(config.timePeriods?.evening?.startTime?.split(':')[0] || '17', 10);
    const isEvening = bookingHour >= eveningStartHour;
    
    // Get appropriate rate based on day and time
    let baseRate;
    if (config.pricingRates) {
      if (isWeekend) {
        baseRate = isEvening ? 
          (config.pricingRates.weekend?.evening || config.baseRate * 1.5) : 
          (config.pricingRates.weekend?.morning || config.baseRate * 1.25);
      } else {
        baseRate = isEvening ? 
          (config.pricingRates.weekday?.evening || config.baseRate * 1.25) : 
          (config.pricingRates.weekday?.morning || config.baseRate);
      }
    } else {
      // Fallback to base rate if pricing rates not configured
      baseRate = config.baseRate;
    }
    
    // Calculate discount percentage based on duration
    let discountPercent = 0;
    if (durationHours >= 4) {
      discountPercent = config.discounts.fourHour;
    } else if (durationHours >= 3) {
      discountPercent = config.discounts.threeHour;
    } else if (durationHours >= 2) {
      discountPercent = config.discounts.twoHour;
    }
    
    // Calculate total amount
    const totalBeforeDiscount = baseRate * durationHours;
    const discountAmount = totalBeforeDiscount * (discountPercent / 100);
    const totalAmount = totalBeforeDiscount - discountAmount;
    
    // Determine time period for display
    const timePeriod = isEvening ? 'evening' : 'morning';
    const dayType = isWeekend ? 'weekend' : 'weekday';
    
    console.log(`💰 Price calculation: Base rate: ${baseRate} (${dayType} ${timePeriod}), Duration: ${durationHours}h, Discount: ${discountPercent}%, Total: ${totalAmount}`);
    
    return {
      baseRate,
      totalBeforeDiscount,
      discountPercent,
      discountAmount,
      totalAmount: Math.round(totalAmount), // Round to nearest integer
      timePeriod,
      dayType
    };
  } catch (error) {
    console.error('❌ Error calculating price:', error);
    // Fallback calculation
    const baseRate = sport === 'cricket' ? 600 : sport === 'pickleball' ? 350 : 400;
    const durationHours = parseFloat(duration);
    
    // Apply time and day based pricing even in fallback
    const bookingDate = date ? new Date(date) : new Date();
    const dayOfWeek = bookingDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const bookingHour = startTime ? parseInt(startTime.split(':')[0], 10) : new Date().getHours();
    const isEvening = bookingHour >= 17; // 5 PM
    
    // Apply rate multipliers
    let adjustedBaseRate = baseRate;
    if (isWeekend && isEvening) {
      adjustedBaseRate = baseRate * 1.5; // Weekend evening
    } else if (isWeekend || isEvening) {
      adjustedBaseRate = baseRate * 1.25; // Weekend morning or weekday evening
    }
    
    // Calculate discount
    let discount = 0;
    if (durationHours >= 4) {
      discount = 0.15;
    } else if (durationHours >= 3) {
      discount = 0.10;
    } else if (durationHours >= 2) {
      discount = 0.05;
    }
    
    const totalBeforeDiscount = adjustedBaseRate * durationHours;
    const discountAmount = totalBeforeDiscount * discount;
    const totalAmount = totalBeforeDiscount - discountAmount;
    
    // Determine time period for display
    const timePeriod = isEvening ? 'evening' : 'morning';
    const dayType = isWeekend ? 'weekend' : 'weekday';
    
    return {
      baseRate: adjustedBaseRate,
      totalBeforeDiscount,
      discountPercent: discount * 100,
      discountAmount,
      totalAmount: Math.round(totalAmount),
      timePeriod,
      dayType
    };
  }
}

module.exports = {
  saveFlowState,
  getFlowState,
  getSportsFacilities,
  getAvailableDates,
  getAvailableTimeSlots,
  getSportConfig,
  calculatePrice,
  createBookingFromFlow
};