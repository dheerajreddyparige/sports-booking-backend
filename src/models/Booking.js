const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  sport: { type: String, required: true, enum: ["badminton", "cricket", "pickleball"] },
  courtId: { type: Number, required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  duration: { type: Number, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  customerName: { type: String, required: true },
  customerEmail: { type: String },
  customerPhone: { type: String, required: true },
  specialRequirements: { type: String },
  status: { type: String, enum: ["confirmed", "pending", "cancelled", "payment_pending", "refunded"], default: "pending" },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  paymentMethod: { type: String, enum: ["razorpay", "paytm", "whatsapp_pay", "cash"], default: "razorpay" },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
  transactionId: String,
  paymentReceipt: String,
  paymentInitiatedAt: { type: Date },
  paymentCompletedAt: { type: Date },
  sessionToken: { type: String },
  flowToken: { type: String },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

bookingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

bookingSchema.index({ sport: 1, date: 1, courtId: 1 });
bookingSchema.index({ customerId: 1 });
bookingSchema.index({ flowToken: 1 });
bookingSchema.index({ sessionToken: 1 });

module.exports = mongoose.model("Booking", bookingSchema);