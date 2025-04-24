// src/models/FlowsState.js
import mongoose from "mongoose";

const flowsStateSchema = new mongoose.Schema({
  flowToken: { type: String, required: true, unique: true },
  screen: { type: String, required: true }, // e.g., "APPOINTMENT"
  data: { type: Object, default: {} }, // Stores user selections
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("FlowsState", flowsStateSchema);