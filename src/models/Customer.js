import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  whatsappId: { type: String, required: true },
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
  paymentHistory: [{
    amount: Number,
    currency: { type: String, default: "INR" },
    paymentMethod: String,
    transactionId: String,
    status: { type: String, enum: ["pending", "completed", "failed", "refunded"], default: "pending" },
    date: { type: Date, default: Date.now }
  }],
  preferences: {
    favoriteSports: [String],
    notificationPreferences: {
      email: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },
  lastActive: { type: Date },
  loginCount: { type: Number, default: 0 },
  lastLogin: { type: Date },
  accountStatus: { type: String, enum: ["active", "suspended", "deleted"], default: "active" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  verificationStatus: {
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    whatsappVerified: { type: Boolean, default: false }
  }
});

customerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("Customer", customerSchema);