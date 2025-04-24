// src/util/flowDbUtils.js
const connectToDatabase = require('./connect-to-database');
const FlowsState = require('../models/FlowsState');
const Booking = require('../models/Booking');
const Court = require('../models/Court');

/**
 * Save or update flow state during WhatsApp interaction
 * @param {string} flowToken - Unique token for the flow session
 * @param {string} screen - Current screen name
 * @param {Object} data - User selections and input data
 */
async function saveFlowState(flowToken, screen, data) {
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
    
    return result;
  } catch (error) {
    console.error('Error saving flow state:', error);
    throw error;
  }
}

/**
 * Get saved flow state
 * @param {string} flowToken - Unique token for the flow session
 */
async function getFlowState(flowToken) {
  await connectToDatabase();
  
  try {
    return await FlowsState.findOne({ flowToken });
  } catch (error) {
    console.error('Error retrieving flow state:', error);
    throw error;
  }
}

/**
 * Get available sports facilities
 */
async function getSportsFacilities() {
  await connectToDatabase();
  
  try {
    const courts = await Court.find({ isActive: true });
    
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
    console.error('Error getting sports facilities:', error);
    // Return default sports if database fails
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
 */
async function getAvailableTimeSlots(sport, date) {
  await connectToDatabase();
  
  try {
    // Get existing bookings for this date and sport
    const bookings = await Booking.find({
      sport,
      date: new Date(date),
      status: { $ne: 'cancelled' }
    });
    
    // Get all courts for this sport
    const courts = await Court.find({ sport, isActive: true });
    
    // Default time slots (30-minute intervals from 6 AM to 9 PM)
    const defaultSlots = [];
    for (let hour = 6; hour < 21; hour++) {
      for (let minute of [0, 30]) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        defaultSlots.push({
          id: timeStr,
          title: timeStr,
          enabled: true
        });
      }
    }
    
    // Mark slots as unavailable if all courts are booked
    defaultSlots.forEach(slot => {
      const slotTime = slot.id;
      const allCourtsBooked = courts.every(court => {
        return bookings.some(booking => {
          return booking.courtId === court.courtId && 
                 booking.startTime <= slotTime && 
                 booking.endTime > slotTime;
        });
      });
      
      slot.enabled = !allCourtsBooked;
    });
    
    return defaultSlots;
  } catch (error) {
    console.error('Error getting available time slots:', error);
    // Return default time slots if database fails
    return [
      { id: '10:00', title: '10:00', enabled: true },
      { id: '11:00', title: '11:00', enabled: true },
      { id: '12:00', title: '12:00', enabled: true },
      { id: '13:00', title: '13:00', enabled: true },
      { id: '14:00', title: '14:00', enabled: true },
      { id: '15:00', title: '15:00', enabled: true },
      { id: '16:00', title: '16:00', enabled: true },
      { id: '17:00', title: '17:00', enabled: true },
      { id: '18:00', title: '18:00', enabled: true }
    ];
  }
}

/**
 * Create a booking from flow state data
 * @param {Object} flowState - Flow state with booking details
 */
async function createBookingFromFlow(flowState) {
  await connectToDatabase();
  
  try {
    // Extract sport and courtId from the combined ID (e.g., "badminton-1")
    const [sport, courtIdStr] = flowState.sport.split('-');
    const courtId = parseInt(courtIdStr, 10);
    
    // Calculate end time (assuming 1-hour slots)
    const startTime = flowState.time;
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const endHour = startHour + 1;
    const endTime = `${endHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
    
    // Create a new booking
    const booking = new Booking({
      sport,
      courtId,
      date: new Date(flowState.date),
      startTime,
      endTime,
      duration: 1, // 1 hour
      userId: flowState.flowToken, // Temporary user ID
      status: 'confirmed',
      createdAt: new Date()
    });
    
    await booking.save();
    
    // Update flow state with booking confirmation
    await FlowsState.findOneAndUpdate(
      { flowToken: flowState.flowToken },
      { status: 'confirmed' }
    );
    
    return booking;
  } catch (error) {
    console.error('Error creating booking from flow:', error);
    throw error;
  }
}

module.exports = {
  saveFlowState,
  getFlowState,
  getSportsFacilities,
  getAvailableDates,
  getAvailableTimeSlots,
  createBookingFromFlow
};