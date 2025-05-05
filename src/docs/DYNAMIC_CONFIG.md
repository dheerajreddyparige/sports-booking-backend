# Dynamic Sport Configuration System

## Overview

This document describes the dynamic configuration system implemented for the sports booking backend. The system allows for configurable settings for each sport, including rates, discounts, and available times. The system now supports time-based and day-based pricing, allowing different rates for weekday/weekend and morning/evening periods.

## Features

- **Sport-specific pricing**: Each sport has its own base rate per hour
- **Time-based pricing**: Different rates for morning and evening time periods
- **Day-based pricing**: Different rates for weekdays and weekends
- **Dynamic discounts**: Configurable discount percentages based on booking duration
- **Configurable time slots**: Set opening and closing times for each sport
- **Flexible booking windows**: Configure how many days in advance bookings are allowed
- **Maintenance scheduling**: Define maintenance periods when courts are unavailable

## Database Models

### SportConfig Model

The `SportConfig` model stores all configurable settings for each sport:

```javascript
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
```

## Utility Functions

The following utility functions have been added to `flowDbUtils.js` to support dynamic configurations:

1. **getSportConfig(sport)**: Retrieves configuration for a specific sport
2. **calculatePrice(sport, duration, date, startTime)**: Calculates the price for a booking based on sport, duration, date, and time of day
3. **getSportsFacilities()**: Enhanced to include configuration data with each sport

## Initialization

A script has been provided to initialize the database with default sport configurations:

```
node src/scripts/initSportConfigs.js
```

This script will create default configurations for badminton, cricket, and pickleball if they don't exist, or update them if they do.

## Usage in WhatsApp Flow

The WhatsApp Flow now uses these dynamic configurations to:

1. Display sport-specific rates in the sport selection screen
2. Show accurate discount information in the duration selection
3. Calculate the correct price based on the selected sport and duration
4. Display appropriate time slots based on the sport's available times

## Extending the System

To add a new sport:

1. Add the sport to the `enum` in the `SportConfig` model
2. Add a new court for the sport in the `Court` model
3. Add a default configuration for the sport in the initialization script
4. Run the initialization script to update the database

## Admin Interface (Future Enhancement)

A future enhancement could include an admin interface to manage these configurations through a web UI instead of directly modifying the database.