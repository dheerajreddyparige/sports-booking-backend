// src/models/Booking.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  sport: { type: String, required: true, enum: ["badminton", "cricket", "pickleball"] },
  courtId: { type: Number, required: true }, // 1-5 for Badminton, 1 for Cricket/Pickleball
  date: { type: Date, required: true },
  startTime: { type: String, required: true }, // e.g., "10:30"
  endTime: { type: String, required: true }, // e.g., "12:30"
  duration: { type: Number, required: true }, // Duration in hours (e.g., 2)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["confirmed", "pending", "cancelled"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Booking", bookingSchema);