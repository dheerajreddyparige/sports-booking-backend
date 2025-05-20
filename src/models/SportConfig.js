const mongoose = require('mongoose');

/**
 * Sport Configuration Model
 * Stores configurable settings for each sport including rates, discounts, and available times
 */
const sportConfigSchema = new mongoose.Schema({
  sport: { 
    type: String, 
    required: true, 
    enum: ["badminton", "cricket", "pickleball"],
    unique: true 
  },
  // Base rate is now a reference rate, actual rates are defined in pricingRates
  baseRate: { 
    type: Number, 
    required: true, 
    min: 0,
    default: 400 
  },
  // Time and day-specific pricing
  pricingRates: {
    weekday: {
      morning: { type: Number }, // Weekday morning rate (default: baseRate)
      evening: { type: Number }  // Weekday evening rate (default: baseRate * 1.25)
    },
    weekend: {
      morning: { type: Number }, // Weekend morning rate (default: baseRate * 1.25)
      evening: { type: Number }  // Weekend evening rate (default: baseRate * 1.5)
    }
  },
  // Time period definitions
  timePeriods: {
    morning: {
      startTime: { type: String, default: "05:00" }, // 5 AM
      endTime: { type: String, default: "17:00" }   // 5 PM
    },
    evening: {
      startTime: { type: String, default: "17:00" }, // 5 PM
      endTime: { type: String, default: "23:00" }   // 11 PM
    }
  },
  discounts: {
    twoHour: { type: Number, default: 5 }, // 5% discount for 2-2.5 hours
    threeHour: { type: Number, default: 10 }, // 10% discount for 3-3.5 hours
    fourHour: { type: Number, default: 15 }  // 15% discount for 4+ hours
  },
  availableTimes: {
    openTime: { type: String, default: "05:00" }, // 5 AM
    closeTime: { type: String, default: "23:00" }  // 11 PM
  },
  maxBookingDays: { type: Number, default: 7 }, // How many days in advance booking is allowed
  maintenanceHours: [{
    day: { type: String, enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
    startTime: { type: String },
    endTime: { type: String }
  }],
  isActive: { type: Boolean, default: true },
  description: { type: String },
  imageUrl: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save middleware to set default pricing rates if not provided
sportConfigSchema.pre('save', function(next) {
  // Set default pricing rates based on baseRate if not explicitly set
  if (!this.pricingRates || !this.pricingRates.weekday || !this.pricingRates.weekend) {
    this.pricingRates = {
      weekday: {
        morning: this.baseRate,
        evening: Math.round(this.baseRate * 1.25)
      },
      weekend: {
        morning: Math.round(this.baseRate * 1.25),
        evening: Math.round(this.baseRate * 1.5)
      }
    };
  }
  next();
});

// The sport field already has an index due to the unique constraint
// No need for additional index creation

module.exports = mongoose.model("SportConfig", sportConfigSchema);