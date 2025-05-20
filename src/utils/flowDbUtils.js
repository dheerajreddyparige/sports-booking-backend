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
 * Get available sports facilities from database
 * @returns {Array} Array of sports with their courts
 */
async function getSportsFacilities() {
  console.log('🔍 Getting sports facilities...');
  await connectToDatabase();
  
  try {
    const courts = await Court.find({ isActive: true });
    console.log(`📋 Found ${courts.length} active courts`);
    
    if (!courts || courts.length === 0) {
      throw new Error('No active courts found in database');
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
    
    // Format for WhatsApp Flows - limit to 10 sports max (WhatsApp limit)
    const formattedSports = Object.entries(sportsFacilities)
      .slice(0, 10)
      .map(([sport, courts]) => ({
        id: sport,
        title: sport.charAt(0).toUpperCase() + sport.slice(1),
        courts: courts
      }));
    
    if (formattedSports.length === 0) {
      throw new Error('No sports facilities available after formatting');
    }
    
    return formattedSports;
  } catch (error) {
    console.error('❌ Error getting sports facilities:', error);
    // Return default sports if database fails - but log the error clearly
    console.log('⚠️ Using default sports facilities due to error:', error.message);
    return [
      { id: 'badminton', title: 'Badminton', courts: [{id: 'badminton-1', title: 'Badminton Court 1'}] },
      { id: 'cricket', title: 'Cricket', courts: [{id: 'cricket-1', title: 'Cricket Ground'}] },
      { id: 'pickleball', title: 'Pickleball', courts: [{id: 'pickleball-1', title: 'Pickleball Court'}] }
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
 * @param {number} duration - Duration in hours
 * @param {string} timeOfDay - Optional: "morning" or "evening"
 * @returns {Array} Array of available time slots
 */
async function getAvailableTimeSlots(sport, date, duration, timeOfDay) {
  console.log('🔍 Getting available time slots:', { sport, date, duration, timeOfDay });
  await connectToDatabase();
  
  try {
    // Validate inputs
    if (!sport || !date || !duration) {
      throw new Error('Missing required parameters: sport, date, or duration');
    }
    
    // Convert duration to number if it's a string
    const durationHours = typeof duration === 'string' ? parseInt(duration, 10) : duration;
    
    // Get sport configuration for operating hours
    const sportConfig = await getSportConfig(sport);
    if (!sportConfig) {
      throw new Error(`Sport configuration not found for ${sport}`);
    }
    
    // Get existing bookings for this date and sport
    const bookings = await Booking.find({
      sport: sport,
      date: new Date(date),
      status: { $nin: ['cancelled', 'rejected'] }
    });
    
    // Get available courts for this sport
    const courts = await Court.find({ sport: sport, isActive: true });
    if (!courts || courts.length === 0) {
      throw new Error(`No active courts found for sport: ${sport}`);
    }
    
    // Get all possible time slots for this sport
    const openTime = sportConfig.availableTimes?.openTime || "05:00";
    const closeTime = sportConfig.availableTimes?.closeTime || "23:00";
    
    // Generate all possible time slots
    const allSlots = generateTimeSlots(openTime, closeTime, durationHours);
    
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
    
    // Filter slots based on time of day if specified
    let filteredSlots = availableSlots.filter(slot => slot.enabled);
    
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
    
    // Format slots for display - limit to 10 for WhatsApp
    const formattedSlots = filteredSlots.slice(0, 10).map(slot => ({
      id: slot.id,
      title: slot.title
    }));
    
    // If no slots available, return empty array
    if (formattedSlots.length === 0) {
      console.log('⚠️ No available time slots found');
      return [];
    }
    
    console.log(`✅ Found ${formattedSlots.length} available time slots`);
    return formattedSlots;
  } catch (error) {
    console.error('❌ Error getting available time slots:', error);
    // Don't return fallback data - let the caller handle the empty result
    return [];
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
    const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    
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
 * Get sport configuration by sport type
 * @param {string} sport - Sport type (badminton, cricket, pickleball)
 * @returns {Object} Sport configuration
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
        maxBookingDays: 7,
        pricingRates: {
          weekday: {
            morning: sport === 'cricket' ? 600 : sport === 'pickleball' ? 350 : 400,
            evening: sport === 'cricket' ? 750 : sport === 'pickleball' ? 450 : 500
          },
          weekend: {
            morning: sport === 'cricket' ? 750 : sport === 'pickleball' ? 450 : 500,
            evening: sport === 'cricket' ? 900 : sport === 'pickleball' ? 550 : 600
          }
        }
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
      maxBookingDays: 7,
      pricingRates: {
        weekday: {
          morning: sport === 'cricket' ? 600 : sport === 'pickleball' ? 350 : 400,
          evening: sport === 'cricket' ? 750 : sport === 'pickleball' ? 450 : 500
        },
        weekend: {
          morning: sport === 'cricket' ? 750 : sport === 'pickleball' ? 450 : 500,
          evening: sport === 'cricket' ? 900 : sport === 'pickleball' ? 550 : 600
        }
      }
    };
  }
}

/**
 * Calculate price for a booking based on sport, duration, date, and time
 * @param {string} sport - Sport type
 * @param {number} duration - Duration in hours
 * @param {string} date - Booking date (YYYY-MM-DD format)
 * @param {string} startTime - Booking start time (HH:MM format)
 * @returns {Object} Price details
 */
async function calculatePrice(sport, duration, date, startTime) {
  console.log(`💰 Calculating price for ${sport}, duration: ${duration}, date: ${date}, time: ${startTime}`);
  
  try {
    // Validate inputs
    if (!sport || !duration || !date || !startTime) {
      throw new Error('Missing required parameters for price calculation');
    }
    
    // Get sport configuration
    const config = await getSportConfig(sport);
    if (!config) {
      throw new Error(`Sport configuration not found for ${sport}`);
    }
    
    // Convert duration to number if it's a string
    const durationHours = typeof duration === 'string' ? parseFloat(duration) : duration;
    
    // Determine if booking is on a weekend
    const bookingDate = new Date(date);
    const dayOfWeek = bookingDate.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Determine if booking is in morning or evening
    const bookingHour = parseInt(startTime.split(':')[0], 10);
    const isEvening = bookingHour >= 17; // 5 PM and later
    
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
      discountPercent = config.discounts?.fourHour || 15;
    } else if (durationHours >= 3) {
      discountPercent = config.discounts?.threeHour || 10;
    } else if (durationHours >= 2) {
      discountPercent = config.discounts?.twoHour || 5;
    }
    
    // Calculate total amount
    const totalBeforeDiscount = baseRate * durationHours;
    const discountAmount = totalBeforeDiscount * (discountPercent / 100);
    const totalAmount = totalBeforeDiscount - discountAmount;
    
    // Determine time period for display
    const timePeriod = isEvening ? 'evening' : 'morning';
    const dayType = isWeekend ? 'weekend' : 'weekday';
    
    console.log(`💰 Price calculation: Base rate: ${baseRate} (${dayType} ${timePeriod}), Duration: ${durationHours}h, Discount: ${discountPercent}%, Total: ${Math.round(totalAmount)}`);
    
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
    // Fallback calculation with clear error logging
    console.error('Using fallback price calculation due to error:', error.message);
    
    const baseRate = sport === 'cricket' ? 600 : sport === 'pickleball' ? 350 : 400;
    const durationHours = typeof duration === 'string' ? parseFloat(duration) : duration;
    
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
  createBookingFromFlow,
  get_time_slots
};