import mongoose from "mongoose";

const courtSchema = new mongoose.Schema({
  sport: { type: String, required: true, enum: ["badminton", "cricket", "pickleball"] },
  courtId: { type: Number, required: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

courtSchema.index({ sport: 1, courtId: 1 });

export default mongoose.model("Court", courtSchema);