const mongoose = require('mongoose');

const flowsStateSchema = new mongoose.Schema({
  flowToken: { type: String, required: true, unique: true },
  screen: { type: String, required: true },
  data: { type: Object, default: {} },
  // Fields for WhatsApp booking flow
  sport: { type: String },
  date: { type: String },
  duration: { type: Number },
  time_slot: { type: String },
  time_slots: { type: String },
  availableSlots: { type: Array, default: [] },
  // Message tracking to prevent duplicate processing
  processedMessages: { type: [String], default: [] },
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 60 * 1000) } // 30 minute timeout
}); 

// Add index for faster lookups
flowsStateSchema.index({ 'processedMessages': 1 });
flowsStateSchema.index({ 'availableSlots.id': 1 });


module.exports = mongoose.model("FlowsState", flowsStateSchema);