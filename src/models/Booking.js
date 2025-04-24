import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  sport: { type: String, required: true, enum: ["badminton", "cricket", "pickleball"] },
  courtId: { type: Number, required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  duration: { type: Number, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  status: { type: String, enum: ["confirmed", "pending", "cancelled"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

bookingSchema.index({ sport: 1, date: 1, courtId: 1 });

export default mongoose.model("Booking", bookingSchema);