/**
 * MySQL Flow Database Utilities
 * Provides functions for interacting with the database for flow state management
 */

const { FlowsState, Court, SportConfig, Booking, Customer } = require('../models/mysql');
const slotUtils = require('./slotUtils');

/**
 * Save flow state to the database
 * @param {Object} flowState - Flow state object
 * @returns {Promise<Object>} Saved flow state
 */
async function saveFlowState(flowState) {
  try {
    const { flowToken } = flowState;
    
    // Check if flow state already exists
    const existingFlowState = await FlowsState.findOne({ flowToken });
    
    if (existingFlowState) {
      // Update existing flow state
      return await FlowsState.update(existingFlowState.id, flowState);
    } else {
      // Create new flow state
      return await FlowsState.create(flowState);
    }
  } catch (error) {
    console.error('Error saving flow state:', error);
    throw error;
  }
}

/**
 * Get flow state from the database
 * @param {string} flowToken - Flow token
 * @returns {Promise<Object|null>} Flow state object or null if not found
 */
async function getFlowState(flowToken) {
  try {
    const state = await FlowsState.findOne({ flowToken });
    
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
    
    return appState;
  } catch (error) {
    console.error('Error getting flow state:', error);
    throw error;
  }
}

/**
 * Get sports facilities from the database
 * @returns {Promise<Array>} Array of sports facilities formatted for WhatsApp Flows
 */
async function getSportsFacilities() {
  try {
    // Get all active courts grouped by sport
    const groupedCourts = await Court.findActiveCourtsByGroup();
    
    // Format sports for WhatsApp Flows
    const sports = Object.keys(groupedCourts).map(sport => ({
      id: sport,
      title: sport.charAt(0).toUpperCase() + sport.slice(1) // Capitalize first letter
    }));
    
    // WhatsApp List Messages can only have up to 10 options
    return sports.slice(0, 10);
  } catch (error) {
    console.error('Error getting sports facilities:', error);
    throw error;
  }
}

/**
 * Get available durations for a sport
 * @param {string} sport - Sport name
 * @returns {Promise<Array>} Array of available durations formatted for WhatsApp Flows
 */
async function getAvailableDurations(sport) {
  try {
    // Define standard durations (in hours)
    const standardDurations = [1, 2, 3, 4];
    
    // Format durations for WhatsApp Flows
    return standardDurations.map(duration => ({
      id: duration.toString(),
      title: `${duration} ${duration === 1 ? 'hour' : 'hours'}`
    }));
  } catch (error) {
    console.error('Error getting available durations:', error);
    throw error;
  }
}

/**
 * Get available dates for booking
 * @param {string} sport - Sport name
 * @returns {Promise<Array>} Array of available dates formatted for WhatsApp Flows
 */
async function getAvailableDates(sport) {
  try {
    // Get sport configuration
    const sportConfig = await SportConfig.findOne({ sport, isActive: true });
    
    if (!sportConfig) {
      throw new Error(`Sport configuration not found for ${sport}`);
    }
    
    const maxBookingDays = sportConfig.maxBookingDays || 7;
    const dates = [];
    
    // Generate dates from today to maxBookingDays
    const today = new Date();
    for (let i = 0; i < maxBookingDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const displayDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      
      dates.push({
        id: formattedDate,
        title: displayDate
      });
    }
    
    // Also return min and max date for DatePicker
    const minDate = today.toISOString().split('T')[0];
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxBookingDays - 1);
    const maxDateStr = maxDate.toISOString().split('T')[0];
    
    return {
      dates,
      min_date: minDate,
      max_date: maxDateStr
    };
  } catch (error) {
    console.error('Error getting available dates:', error);
    throw error;
  }
}

/**
 * Get available time slots for a sport, date, and duration
 * @param {string} sport - Sport name
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {number} duration - Duration in hours
 * @param {number} page - Page number for pagination
 * @param {number} pageSize - Number of items per page
 * @returns {Promise<Object>} Object with available slots and pagination info
 */
async function getAvailableTimeSlots(sport, date, duration, page = 1, pageSize = 5) {
  try {
    // Get sport configuration
    const sportConfig = await SportConfig.findOne({ sport, isActive: true });
    
    if (!sportConfig) {
      throw new Error(`Sport configuration not found for ${sport}`);
    }
    
    // Get all active courts for the sport
    const courts = await Court.findActiveCourtsForSport(sport);
    
    if (!courts || courts.length === 0) {
      throw new Error(`No active courts found for ${sport}`);
    }
    
    // Get all available slots using slotUtils
    const allSlots = await slotUtils.generateAvailableSlots(sport, date, duration, courts, sportConfig);
    
    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedSlots = allSlots.slice(startIndex, endIndex);
    
    return {
      slots: paginatedSlots,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(allSlots.length / pageSize),
        totalItems: allSlots.length
      }
    };
  } catch (error) {
    console.error('Error getting available time slots:', error);
    throw error;
  }
}

/**
 * Get customer by phone number
 * @param {string} phoneNumber - Customer phone number
 * @returns {Promise<Object|null>} Customer object or null if not found
 */
async function getCustomerByPhone(phoneNumber) {
  try {
    return await Customer.findOne({ phoneNumber });
  } catch (error) {
    console.error('Error getting customer by phone:', error);
    throw error;
  }
}

/**
 * Get customer by WhatsApp ID
 * @param {string} whatsappId - Customer WhatsApp ID
 * @returns {Promise<Object|null>} Customer object or null if not found
 */
async function getCustomerByWhatsappId(whatsappId) {
  try {
    return await Customer.findOne({ whatsappId });
  } catch (error) {
    console.error('Error getting customer by WhatsApp ID:', error);
    throw error;
  }
}

/**
 * Create or update customer
 * @param {Object} customerData - Customer data
 * @returns {Promise<Object>} Created or updated customer
 */
async function createOrUpdateCustomer(customerData) {
  try {
    const { phoneNumber, whatsappId } = customerData;
    
    // Check if customer already exists
    let customer = await Customer.findOne({ phoneNumber }) || 
                   await Customer.findOne({ whatsappId });
    
    if (customer) {
      // Update existing customer
      return await Customer.update(customer.id, {
        ...customerData,
        lastActivity: true // Update last activity timestamp
      });
    } else {
      // Create new customer
      return await Customer.create(customerData);
    }
  } catch (error) {
    console.error('Error creating or updating customer:', error);
    throw error;
  }
}

/**
 * Get customer bookings
 * @param {string} phoneNumber - Customer phone number
 * @param {string} status - Booking status filter (optional)
 * @returns {Promise<Array>} Array of customer bookings
 */
async function getCustomerBookings(phoneNumber, status) {
  try {
    // Get customer by phone number
    const customer = await Customer.findOne({ phoneNumber });
    
    if (!customer) {
      return [];
    }
    
    // Build filter object
    const filter = { customerId: customer.id };
    if (status) {
      filter.status = status;
    }
    
    // Get bookings
    return await Booking.find(filter);
  } catch (error) {
    console.error('Error getting customer bookings:', error);
    throw error;
  }
}

/**
 * Create a new booking
 * @param {Object} bookingData - Booking data
 * @returns {Promise<Object>} Created booking
 */
async function createBooking(bookingData) {
  try {
    return await Booking.create(bookingData);
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
}

/**
 * Update a booking
 * @param {string} bookingId - Booking ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated booking
 */
async function updateBooking(bookingId, updateData) {
  try {
    const booking = await Booking.findOne({ bookingId });
    
    if (!booking) {
      throw new Error(`Booking not found with ID: ${bookingId}`);
    }
    
    return await Booking.update(booking.id, updateData);
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
}

/**
 * Get a booking by ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object|null>} Booking object or null if not found
 */
async function getBookingById(bookingId) {
  try {
    return await Booking.findOne({ bookingId });
  } catch (error) {
    console.error('Error getting booking by ID:', error);
    throw error;
  }
}

/**
 * Delete old flow states
 * @param {number} hours - Number of hours
 * @returns {Promise<number>} Number of deleted flow states
 */
async function deleteOldFlowStates(hours = 24) {
  try {
    return await FlowsState.deleteOldFlowStates(hours);
  } catch (error) {
    console.error('Error deleting old flow states:', error);
    throw error;
  }
}

module.exports = {
  saveFlowState,
  getFlowState,
  getSportsFacilities,
  getAvailableDurations,
  getAvailableDates,
  getAvailableTimeSlots,
  getCustomerByPhone,
  getCustomerByWhatsappId,
  createOrUpdateCustomer,
  getCustomerBookings,
  createBooking,
  updateBooking,
  getBookingById,
  deleteOldFlowStates
};