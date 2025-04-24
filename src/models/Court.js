// src/models/Court.js
import mongoose from "mongoose";

const courtSchema = new mongoose.Schema({
  sport: { type: String, required: true, enum: ["badminton", "cricket", "pickleball"] },
  courtId: { type: Number, required: true }, // 1-5 for Badminton, 1 for others
  name: { type: String, required: true }, // e.g., "Badminton Court 1"
  isActive: { type: Boolean, default: true },
});

export default mongoose.model("Court", courtSchema);