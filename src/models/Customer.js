import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  whatsappId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Customer", customerSchema);