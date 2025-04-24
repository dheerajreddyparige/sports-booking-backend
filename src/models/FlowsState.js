// src/models/FlowsState.js
const mongoose = require('mongoose');

const flowsStateSchema = new mongoose.Schema({
  flowToken: { type: String, required: true, unique: true },
  sport: { type: String, enum: ["badminton", "cricket", "pickleball"] },
  courtId: { type: Number },
  date: { type: String },
  time: { type: String },
  name: { type: String },
  email: { type: String },
  phone: { type: String },
  more_details: { type: String },
  status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
  screen: { type: String, required: true }, // Current screen in the flow
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("FlowsState", flowsStateSchema);