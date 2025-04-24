# Sports Booking WhatsApp Flows Integration

This project integrates WhatsApp Flows with a sports booking backend system, allowing users to book badminton courts and cricket grounds through WhatsApp.

## Overview

The system enables users to:
- Select a sport (badminton or cricket)
- Choose a location
- Pick a date and time slot
- Enter personal details
- Confirm and receive booking confirmation

## Setup Instructions

### Prerequisites

- Node.js and npm installed
- MongoDB database
- WhatsApp Business Account with Flows access

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   APP_SECRET=your_whatsapp_app_secret
   PRIVATE_KEY=your_private_key
   PASSPHRASE=your_passphrase (if applicable)
   ```

### Generate Keys for WhatsApp Flows

To generate the necessary encryption keys for WhatsApp Flows:

```
node src/util/keyGenerator.js [passphrase]
```

This will generate a public/private key pair in the `src/keys` directory. Upload the public key to your WhatsApp Business Platform and add the private key to your `.env` file.

## WhatsApp Flow Setup

1. Create a new Flow in the WhatsApp Business Platform
2. Set up the Flow with the following screens:
   - APPOINTMENT: For selecting sport, location, date, and time
   - DETAILS: For collecting user information
   - CONFIRMATION: To confirm booking details
   - SUMMARY: To display booking confirmation
3. Configure the Flow endpoint to point to your server's URL

## API Endpoints

- `/` - WhatsApp Flows webhook endpoint
- `/api/health` - Health check endpoint
- `/api/available-slots` - Get available time slots
- `/api/bookings` - Create a new booking
- `/api/sports` - Get available sports

## Development

Start the development server:

```
npm run dev
```

## Security

This implementation includes:
- Request signature validation
- End-to-end encryption for WhatsApp communication
- Secure key management

## License

This project uses code from Meta's WhatsApp Flows Tools, which is licensed under the MIT License.