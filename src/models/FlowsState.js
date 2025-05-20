const mongoose = require('mongoose');

const flowsStateSchema = new mongoose.Schema({
  // Unique token for the flow session
  flowToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Current screen in the flow
  screen: {
    type: String
  },
  
  // User's phone number
  phoneNumber: {
    type: String,
    index: true
  },
  
  // Booking information
  sport: String,
  date: String,
  duration: Number,
  timeSlot: String,
  
  // Array of processed message IDs to prevent duplicate processing
  processedMessages: [String],
  
  // Available slots for the current booking session
  availableSlots: [{
    id: String,
    title: String,
    price: Number
  }],
  
  // Selected slot ID
  selectedSlotId: String,
  
  // Payment information
  paymentId: String,
  paymentStatus: String,
  
  // Booking ID if created
  bookingId: String,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for faster lookups
flowsStateSchema.index({ phoneNumber: 1, updatedAt: -1 });
flowsStateSchema.index({ updatedAt: 1 });

module.exports = mongoose.model('FlowsState', flowsStateSchema);