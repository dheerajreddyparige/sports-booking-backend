import Booking from "../models/Booking.js";
import Court from "../models/Court.js";
import FlowsState from "../models/FlowsState.js";

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const getAvailableSlots = async (sport, date, duration) => {
  console.log('🕒 Getting available slots:', { sport, date, duration });
  
  if (!["badminton", "cricket", "pickleball"].includes(sport)) {
    console.error('❌ Invalid sport:', sport);
    throw new Error("Invalid sport");
  }
  if (!date || !duration) {
    console.error('❌ Missing date or duration');
    throw new Error("Date and duration are required");
  }

  const durationHours = parseFloat(duration.replace("hr", ""));
  const durationMinutes = durationHours * 60;
  console.log(`📏 Duration in minutes: ${durationMinutes}`);

  console.log('🔍 Fetching bookings and courts...');
  const bookings = await Booking.find({
    sport,
    date: new Date(date),
    status: { $ne: "cancelled" },
  });
  console.log(`📋 Found ${bookings.length} existing bookings`);
  
  const courts = await Court.find({ sport, isActive: true });
  console.log(`📋 Found ${courts.length} active courts`);
  
  if (!courts.length) {
    console.error(`❌ No active courts for ${sport}`);
    throw new Error(`No active courts for ${sport}`);
  }

  // Generate all possible slots from 5 AM to 12 AM
  const slots = [];
  for (let hour = 5; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const startTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      let isAvailable = false;

      const courtBookings = bookings.reduce((acc, booking) => {
        acc[booking.courtId] = acc[booking.courtId] || [];
        acc[booking.courtId].push({
          start: booking.startTime,
          end: booking.endTime,
        });
        return acc;
      }, {});

      if (sport === "badminton") {
        isAvailable = courts.some((court) => {
          const courtId = court.courtId;
          const bookings = courtBookings[courtId] || [];
          return !bookings.some((booking) => {
            const bookingStart = timeToMinutes(booking.start);
            const bookingEnd = timeToMinutes(booking.end);
            const slotStart = timeToMinutes(startTime);
            const slotEnd = slotStart + durationMinutes;
            return slotStart < bookingEnd && slotEnd > bookingStart;
          });
        });
      } else {
        const courtId = courts[0]?.courtId || 1;
        const bookings = courtBookings[courtId] || [];
        isAvailable = !bookings.some((booking) => {
          const bookingStart = timeToMinutes(booking.start);
          const bookingEnd = timeToMinutes(booking.end);
          const slotStart = timeToMinutes(startTime);
          const slotEnd = slotStart + durationMinutes;
          return slotStart < bookingEnd && slotEnd > bookingStart;
        });
      }

      slots.push({
        id: startTime,
        title: `${startTime} - ${formatEndTime(startTime, durationMinutes)}`,
        enabled: isAvailable,
      });
    }
  }

  console.log(`✅ Generated ${slots.length} time slots, filtering available ones...`);
  
  // Filter to only available slots and limit to 20 options
  const availableSlots = slots.filter(slot => slot.enabled).slice(0, 20);
  
  // If we have fewer than 2 available slots, add some default ones
  if (availableSlots.length < 2) {
    return [
      { id: "09:00", title: "9:00 AM - 10:00 AM", enabled: false },
      { id: "17:00", title: "5:00 PM - 6:00 PM", enabled: false }
    ];
  }
  
  return availableSlots;
};

// Helper function to format end time
const formatEndTime = (startTime, durationMinutes) => {
  const [hours, minutes] = startTime.split(":").map(Number);
  let totalMinutes = hours * 60 + minutes + durationMinutes;
  
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
};

const saveFlowState = async (flowToken, screen, data) => {
  console.log('💾 Saving flow state:', { flowToken, screen, data });
  
  if (!flowToken) {
    console.error('❌ Flow token is required');
    throw new Error("Flow token is required");
  }
  
  try {
    await FlowsState.findOneAndUpdate(
      { flowToken },
      { screen, data, updatedAt: new Date() },
      { upsert: true }
    );
    console.log('✅ Flow state saved successfully');
  } catch (error) {
    console.error('❌ Error saving flow state:', error);
    throw error;
  }
};

const getFlowState = async (flowToken) => {
  console.log('🔍 Getting flow state for token:', flowToken);
  
  if (!flowToken) {
    console.log('⚠️ No flow token provided, returning default state');
    return { screen: "APPOINTMENT", data: {} };
  }
  
  try {
    const state = await FlowsState.findOne({ flowToken });
    console.log('📋 Flow state retrieved:', state ? 'Found' : 'Not found');
    return state || { screen: "APPOINTMENT", data: {} };
  } catch (error) {
    console.error('❌ Error retrieving flow state:', error);
    return { screen: "APPOINTMENT", data: {} };
  }
};

export { getAvailableSlots, saveFlowState, getFlowState };