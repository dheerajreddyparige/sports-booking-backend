// src/utils/slotUtils.js
const connectToDatabase = require('./mysql-connection');
const Booking = require('../models/mysql/Booking');
const Court = require('../models/mysql/Court');
const SportConfig = require('../models/mysql/SportConfig');

/**
 * Get available slots for a specific sport, date and duration
 * @param {string} sport - Sport type (badminton, cricket, etc.)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} duration - Duration in hours
 * @returns {Array} - Array of available time slots
 */
async function getAvailableSlots(sport, date, durationHours) {
  console.log(`🔍 Getting available slots for ${sport} on ${date} for ${durationHours} hours`);
  await connectToDatabase();
  
  try {
    // Get sport configuration for operating hours
    const sportConfig = await SportConfig.findOne({ sport, isActive: true });
    
    if (!sportConfig) {
      console.warn(`⚠️ No sport configuration found for ${sport}, using default hours`);
      return generateDefaultTimeSlots(durationHours);
    }
    
    // Get operating hours from sport config
    const openTime = sportConfig.availableTimes?.openTime || "05:00";
    const closeTime = sportConfig.availableTimes?.closeTime || "23:00";
    
    // Get all courts for this sport
    const courts = await Court.find({ sport, isActive: true });
    if (!courts || courts.length === 0) {
      console.warn(`⚠️ No courts found for ${sport}, cannot check availability`);
      return generateDefaultTimeSlots(durationHours);
    }
    
    // Get all court IDs for this sport
    const courtIds = courts.map(court => court.courtId);
    
    // Get existing bookings for this date and these courts
    // Create date at noon to avoid timezone issues
    const bookingDate = new Date(date);
    bookingDate.setHours(12, 0, 0, 0);
    
    const nextDay = new Date(bookingDate);
    nextDay.setDate(bookingDate.getDate() + 1);
    
    const existingBookings = await Booking.find({
      courtId: { $in: courtIds },
      date: {
        $gte: bookingDate,
        $lt: nextDay
      },
      status: { $nin: ['cancelled', 'rejected'] }
    });
    
    console.log(`📋 Found ${existingBookings.length} existing bookings for ${sport} on ${date}`);
    
    // Generate all possible time slots based on operating hours
    const timeSlots = generateTimeSlots(openTime, closeTime, durationHours);
    
    // Mark slots as unavailable if they overlap with existing bookings
    const availableSlots = timeSlots.map(slot => {
      const [slotHour, slotMinute] = slot.id.split(':').map(Number);
      const slotStartTime = slotHour * 60 + slotMinute;
      const slotEndTime = slotStartTime + (durationHours * 60);
      
      // Check if this slot overlaps with any existing booking
      const isOverlapping = existingBookings.some(booking => {
        const [bookingStartHour, bookingStartMinute] = booking.startTime.split(':').map(Number);
        const [bookingEndHour, bookingEndMinute] = booking.endTime.split(':').map(Number);
        
        const bookingStartTime = bookingStartHour * 60 + bookingStartMinute;
        const bookingEndTime = bookingEndHour * 60 + bookingEndMinute;
        
        // Check for overlap
        return (
          (slotStartTime < bookingEndTime && slotEndTime > bookingStartTime) &&
          // Only consider it unavailable if ALL courts are booked
          existingBookings.filter(b => 
            b.startTime === booking.startTime && 
            b.endTime === booking.endTime
          ).length >= courtIds.length
        );
      });
      
      return {
        ...slot,
        enabled: !isOverlapping
      };
    });
    
    console.log(`✅ Generated ${availableSlots.length} time slots, ${availableSlots.filter(s => s.enabled).length} available`);
    return availableSlots;
  } catch (error) {
    console.error('❌ Error getting available slots:', error);
    return generateDefaultTimeSlots(durationHours);
  }
}

/**
 * Generate time slots based on operating hours
 * @param {string} openTime - Opening time (HH:MM format)
 * @param {string} closeTime - Closing time (HH:MM format)
 * @param {number} durationHours - Duration in hours
 * @returns {Array} - Array of time slots
 */
function generateTimeSlots(openTime, closeTime, durationHours) {
  const slots = [];
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  
  // Generate slots at 30-minute intervals
  for (let minutes = openMinutes; minutes <= closeMinutes - (durationHours * 60); minutes += 30) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    
    const slotId = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // Calculate end time for display
    const endMinutes = minutes + (durationHours * 60);
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    
    // Format times for display (12-hour format with AM/PM)
    const startTime = formatTime(hour, minute);
    const endTime = formatTime(endHour, endMinute);
    
    slots.push({
      id: slotId,
      title: `${startTime} - ${endTime}`,
      enabled: true
    });
  }
  
  return slots;
}

/**
 * Format time in 12-hour format with AM/PM
 * @param {number} hour - Hour (0-23)
 * @param {number} minute - Minute (0-59)
 * @returns {string} - Formatted time string
 */
function formatTime(hour, minute) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

/**
 * Generate default time slots when database lookup fails
 * @param {number} durationHours - Duration in hours
 * @returns {Array} - Array of default time slots
 */
function generateDefaultTimeSlots(durationHours) {
  // Default operating hours: 5 AM to 11 PM
  return generateTimeSlots("05:00", "23:00", durationHours);
}

module.exports = {
  getAvailableSlots
};