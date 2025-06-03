# Required Environment Variables for WhatsApp Payment Integration

To properly configure your WhatsApp payment integration, you need to set up the following environment variables in your `.env` file:

## Server Configuration
```
PORT=3000
NODE_ENV=development
```

## Database Configuration
```
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=sports_booking
```

## WhatsApp API Configuration
```
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_VERSION=v18.0
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_APP_SECRET=your_app_secret
```

## WhatsApp Payment API Configuration
```
# The payment configuration names are now hardcoded in the application as:
# Razorpay: "pitzone_razorpay"
# UPI: "PitZone_Upi"
# These must match exactly with the configuration names in your WhatsApp Business Manager
```

## Razorpay Configuration
```
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_MERCHANT_ID=your_razorpay_merchant_id
```

## UPI Configuration
```
UPI_MERCHANT_VPA=your_merchant_vpa@ybl
UPI_MERCHANT_NAME=Your Business Name
```

## Test Configuration
```
TEST_PHONE_NUMBER=919876543210
```

## How to Set Up Payment Configurations in WhatsApp Business Manager

1. Go to your WhatsApp Business Manager account
2. Navigate to the "Payment Configuration" section under "India" tab
3. Set up a Razorpay payment configuration by linking your Razorpay merchant account
   - **Important**: Name this configuration exactly as "pitzone_razorpay"
4. Set up a UPI payment configuration with your UPI VPA (Virtual Payment Address)
   - **Important**: Name this configuration exactly as "PitZone_Upi"
5. These configuration names are hardcoded in the application code

## Troubleshooting Common Issues

If you encounter issues with payment integration:

1. **Check Configuration Names**: Ensure your payment configurations in WhatsApp Business Manager are named exactly as "pitzone_razorpay" and "PitZone_Upi"
2. **Verify API Credentials**: Double-check your Razorpay API credentials and UPI merchant details
3. **Format Phone Numbers**: Ensure phone numbers are properly formatted with country code (e.g., '91' prefix for India)
4. **Test with Test Script**: Use the test-payment-integration.js script to verify your implementation
5. **Check Webhook Responses**: Monitor webhook responses from payment gateways for any error messages 