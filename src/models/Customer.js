// src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // Unique ID (e.g., WhatsApp ID)
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  whatsappId: { type: String, required: true }, // For WhatsApp Flows
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);