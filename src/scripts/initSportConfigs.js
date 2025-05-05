require('dotenv').config();
const mongoose = require('mongoose');
const connectToDatabase = require('../utils/connect-to-database');
const SportConfig = require('../models/SportConfig');

// Default sport configurations
const defaultConfigs = [
  {
    sport: 'badminton',
    baseRate: 400,
    // Time and day-specific pricing
    pricingRates: {
      weekday: {
        morning: 300,     // Standard rate for weekday mornings
        evening: 350      // 25% higher for weekday evenings
      },
      weekend: {
        morning: 350,     // 25% higher for weekend mornings
        evening: 400      // 50% higher for weekend evenings
      }
    },
    // Time period definitions
    timePeriods: {
      morning: {
        startTime: "05:00",
        endTime: "12:00"
      },
      evening: {
        startTime: "12:00",
        endTime: "22:00"
      }
    },
    discounts: {
      twoHour: 5,
      threeHour: 10,
      fourHour: 15
    },
    availableTimes: {
      openTime: "05:00",
      closeTime: "22:00"
    },
    maxBookingDays: 7,
    description: "Indoor Badminton Court",
    imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    isActive: true
  },
  {
    sport: 'cricket',
    baseRate: 800,
    // Time and day-specific pricing
    pricingRates: {
      weekday: {
        morning: 600,     // Standard rate for weekday mornings
        evening: 700      // 25% higher for weekday evenings
      },
      weekend: {
        morning: 700,     // 25% higher for weekend mornings
        evening: 800      // 50% higher for weekend evenings
      }
    },
    // Time period definitions
    timePeriods: {
      morning: {
        startTime: "05:00",
        endTime: "12:00"
      },
      evening: {
        startTime: "12:00",
        endTime: "23:59"
      }
    },
    discounts: {
      twoHour: 5,
      threeHour: 10,
      fourHour: 15
    },
    availableTimes: {
      openTime: "05:00",
      closeTime: "23:59"
    },
    maxBookingDays: 14,
    description: "Cricket Ground with Pitch",
    imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    isActive: true
  },
  {
    sport: 'pickleball',
    baseRate: 600,
    // Time and day-specific pricing
    pricingRates: {
      weekday: {
        morning: 500,     // Standard rate for weekday mornings
        evening: 550      // 25% higher for weekday evenings
      },
      weekend: {
        morning: 550,     // 25% higher for weekend mornings
        evening: 600      // 50% higher for weekend evenings
      }
    },
    // Time period definitions
    timePeriods: {
      morning: {
        startTime: "05:00",
        endTime: "12:00"
      },
      evening: {
        startTime: "12:00",
        endTime: "23:59"
      }
    },
    discounts: {
      twoHour: 5,
      threeHour: 10,
      fourHour: 15
    },
    availableTimes: {
      openTime: "05:00",
      closeTime: "23:59"
    },
    maxBookingDays: 7,
    description: "Outdoor Pickleball Court",
    imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    isActive: true
  }
];

/**
 * Initialize sport configurations
 */
async function initSportConfigs() {
  try {
    console.log('🔄 Connecting to database...');
    await connectToDatabase();
    console.log('✅ Connected to database');
    
    console.log('🔄 Initializing sport configurations...');
    
    // For each sport config, update if exists or create if not
    for (const config of defaultConfigs) {
      const result = await SportConfig.findOneAndUpdate(
        { sport: config.sport },
        config,
        { upsert: true, new: true }
      );
      
      console.log(`✅ Configured ${config.sport} with base rate ₹${config.baseRate}/hr`);
    }
    
    console.log('✅ Sport configurations initialized successfully');
    
    // Close the database connection
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    
  } catch (error) {
    console.error('❌ Error initializing sport configurations:', error);
    process.exit(1);
  }
}

// Run the initialization function
initSportConfigs();