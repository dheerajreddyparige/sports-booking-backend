# Sports Booking Database Guide

## MongoDB Models

This project uses MongoDB for data storage. Here are the main models used in the system:

### Court Model

Represents sports facilities available for booking.

```javascript
{
  sport: String,       // "badminton", "cricket", or "pickleball"
  courtId: Number,     // 1-5 for Badminton, 1 for Cricket/Pickleball
  name: String,        // e.g., "Badminton Court 1"
  isActive: Boolean    // Whether the court is available for booking
}
```

### Booking Model

Represents a booking made by a user.

```javascript
{
  sport: String,       // "badminton", "cricket", or "pickleball"
  courtId: Number,     // Court identifier
  date: Date,          // Booking date
  startTime: String,   // e.g., "10:30"
  endTime: String,     // e.g., "11:30"
  duration: Number,    // Duration in hours
  userId: ObjectId,    // Reference to User model
  status: String,      // "confirmed", "pending", or "cancelled"
  createdAt: Date      // When the booking was created
}
```

### User Model

Represents a user who can make bookings.

```javascript
{
  userId: String,      // Unique ID
  name: String,        // User's name
  email: String,       // User's email
  phone: String,       // User's phone number
  whatsappId: String,  // WhatsApp identifier
  createdAt: Date      // When the user was created
}
```

### FlowsState Model

Tracks WhatsApp Flow sessions and user selections during the booking process.

```javascript
{
  flowToken: String,   // Unique token for the flow session
  sport: String,       // Selected sport
  courtId: Number,     // Selected court
  date: String,        // Selected date
  time: String,        // Selected time
  name: String,        // User's name
  email: String,       // User's email
  phone: String,       // User's phone number
  more_details: String,// Additional booking details
  status: String,      // "pending", "confirmed", or "cancelled"
  screen: String,      // Current screen in the flow
  updatedAt: Date      // When the flow state was last updated
}
```

## Database Functions

The following utility functions are available for interacting with the database:

### Flow Database Utilities (`flowDbUtils.js`)

- `saveFlowState(flowToken, screen, data)`: Save or update flow state during WhatsApp interaction
- `getFlowState(flowToken)`: Get saved flow state
- `getSportsFacilities()`: Get available sports facilities
- `getAvailableDates()`: Get available dates (next 7 days)
- `getAvailableTimeSlots(sport, date)`: Get available time slots for a specific sport and date
- `createBookingFromFlow(flowState)`: Create a booking from flow state data

## Database Initialization

To initialize the database with sample courts data, run:

```bash
node src/util/scripts/initDb.js
```

This will create the following courts:
- 5 Badminton Courts
- 1 Cricket Ground
- 1 Pickleball Court

## WhatsApp Flow Integration

The WhatsApp Flow integration uses these models and functions to:

1. Present available sports facilities to users
2. Show available dates and time slots
3. Track user selections throughout the booking process
4. Create bookings when users confirm their selections

The flow is managed by the `getNextScreen` function in `flow.js`, which handles different screens and user interactions.