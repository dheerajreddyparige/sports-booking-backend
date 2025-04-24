// src/utils/slotUtils.js
import Booking from "../models/Booking.js";
import Court from "../models/Court.js";
import FlowsState from "../models/FlowsState.js";

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const getAvailableSlots = async (sport, date, duration) => {
  const durationHours = parseFloat(duration.replace("hr", ""));
  const durationMinutes = durationHours * 60;

  // Fetch bookings and courts
  const bookings = await Booking.find({
    sport,
    date: new Date(date),
    status: { $ne: "cancelled" },
  });
  const courts = await Court.find({ sport, isActive: true });

  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
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
        // At least one court must be free
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
        // Single court must be free
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
        title: startTime,
        enabled: isAvailable,
      });
    }
  }

  return slots;
};

const saveFlowState = async (flowToken, screen, data) => {
  await FlowsState.findOneAndUpdate(
    { flowToken },
    { screen, data, updatedAt: new Date() },
    { upsert: true }
  );
};

const getFlowState = async (flowToken) => {
  const state = await FlowsState.findOne({ flowToken });
  return state || { screen: "APPOINTMENT", data: {} };
};

export { getAvailableSlots, saveFlowState, getFlowState };