// src/util/scripts/demoBooking.js
const connectToDatabase = require('../connect-to-database');
const flowDbUtils = require('../flowDbUtils');
const Booking = require('../../models/Booking');
const Court = require('../../models/Court');
const FlowsState = require('../../models/FlowsState');

/**
 * Demonstrates how to use the MongoDB models and functions
 * for the sports booking system
 */
async function demoBookingSystem() {
  try {
    // Connect to database
    await connectToDatabase();
    console.log('Connected to database');
    
    // 1. Get available sports facilities
    console.log('\n--- Available Sports Facilities ---');
    const sportsFacilities = await flowDbUtils.getSportsFacilities();
    console.log(sportsFacilities);
    
    // 2. Get available dates
    console.log('\n--- Available Dates ---');
    const availableDates = await flowDbUtils.getAvailableDates();
    console.log(availableDates);
    
    // 3. Get available time slots for badminton today
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n--- Available Time Slots for Badminton on ${today} ---`);
    const timeSlots = await flowDbUtils.getAvailableTimeSlots('badminton', today);
    console.log(timeSlots);
    
    // 4. Simulate a WhatsApp Flow booking process
    console.log('\n--- Simulating WhatsApp Flow Booking Process ---');
    
    // Create a mock flow token
    const flowToken = 'demo-' + Date.now();
    
    // Save initial flow state (APPOINTMENT screen)
    await flowDbUtils.saveFlowState(flowToken, 'APPOINTMENT', {
      sport: 'badminton',
      location: 'badminton-1'
    });
    console.log('Saved initial flow state');
    
    // Update flow state with date and time (still on APPOINTMENT screen)
    await flowDbUtils.saveFlowState(flowToken, 'APPOINTMENT', {
      sport: 'badminton',
      location: 'badminton-1',
      date: today,
      time: '10:00'
    });
    console.log('Updated flow state with date and time');
    
    // Save user details (DETAILS screen)
    await flowDbUtils.saveFlowState(flowToken, 'DETAILS', {
      sport: 'badminton',
      location: 'badminton-1',
      date: today,
      time: '10:00',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      more_details: 'Need rackets and shuttlecocks'
    });
    console.log('Saved user details');
    
    // Get the complete flow state
    const flowState = await flowDbUtils.getFlowState(flowToken);
    console.log('\n--- Complete Flow State ---');
    console.log(flowState);
    
    // Create a booking from the flow state
    const booking = await flowDbUtils.createBookingFromFlow(flowState);
    console.log('\n--- Created Booking ---');
    console.log(booking);
    
    // Query all bookings for today
    const todayBookings = await Booking.find({
      date: new Date(today),
      status: { $ne: 'cancelled' }
    });
    console.log(`\n--- All Bookings for ${today} ---`);
    console.log(todayBookings);
    
    console.log('\nDemo completed successfully!');
  } catch (error) {
    console.error('Error in demo:', error);
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  demoBookingSystem()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

module.exports = demoBookingSystem;