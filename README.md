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
   - BOOKING: For selecting sport, date, duration, and time slots
   - SUMMARY: For collecting user information and displaying booking details
   - SUCCESS: To display booking confirmation and invoice
3. Configure the Flow endpoint to point to your server's URL
4. The flow follows the PITZONE Booking structure with the following features:
   - Sports selection (Badminton, Cricket, Pickleball) with dynamic pricing
   - Date selection
   - Duration selection with configurable automatic discounts
   - Time slot selection based on availability
   - User information collection
   - Terms and cancellation policy acceptance
   - Payment integration with Razorpay
   - Booking confirmation with invoice

## WhatsApp Webhook Integration

### Setup Instructions

1. Add the following environment variables to your `.env` file:
   ```
   WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
   WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
   WHATSAPP_VERIFY_TOKEN=your_custom_verify_token
   ```

2. Configure the webhook in the WhatsApp Business Platform:
   - Webhook URL: `https://your-domain.com/api/webhook`
   - Verify token: Use the same value as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to the following events:
     - `messages`
     - `message_template_status_update`

3. The webhook endpoint supports:
   - Receiving incoming messages from customers
   - Processing template responses
   - Handling message status updates
   - Integrating with WhatsApp Flows

## Dynamic Configuration System

The booking system now supports dynamic configurations for each sport:

- **Sport-specific pricing**: Each sport has its own configurable base rate
- **Time-based pricing**: Different rates for morning and evening time periods
- **Day-based pricing**: Different rates for weekdays and weekends
- **Dynamic discounts**: Configurable discount percentages based on booking duration
- **Configurable time slots**: Set opening and closing times for each sport

To initialize the sport configurations in the database:

```bash
node src/scripts/initSportConfigs.js
```

For detailed documentation on the dynamic configuration system, see [Dynamic Configuration Documentation](src/docs/DYNAMIC_CONFIG.md).

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