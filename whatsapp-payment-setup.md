# WhatsApp Payment Integration Setup Guide

This guide will help you set up WhatsApp payment integration for your sports booking application.

## 1. Fix Server Startup Issue

We fixed the server startup issue by correcting the route handler in `src/api/routes/whatsappFlowRoutes.js`:

1. Changed `flowController.handlePaymentStatus` to `flowController.handlePaymentWebhook`
2. Updated the import for WhatsApp service to use the correct path

## 2. Required Environment Variables

Make sure you have the following environment variables set in your `.env` file:

```
# WhatsApp API Configuration
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_VERSION=v18.0
WHATSAPP_VERIFY_TOKEN=your_verify_token

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_MERCHANT_ID=your_razorpay_merchant_id

# UPI Configuration
UPI_MERCHANT_VPA=your_merchant_vpa@ybl
UPI_MERCHANT_NAME=Your Business Name
```

You can run `node check-env.js` to check if all required environment variables are set.

## 3. WhatsApp Business Manager Setup

Before the payment integration will work, you need to set up payment configurations in your WhatsApp Business Manager:

1. Log in to your [WhatsApp Business Manager](https://business.facebook.com/)
2. Navigate to the WhatsApp account you're using
3. Go to the "Payment Configuration" section under "India" tab
4. Set up a Razorpay payment configuration:
   - Click "Add Payment Configuration"
   - Select "Razorpay" as the payment provider
   - Enter your Razorpay merchant ID and other required details
   - **IMPORTANT**: Name this configuration exactly as "pitzone_razorpay"
   - Save the configuration
5. Set up a UPI payment configuration:
   - Click "Add Payment Configuration"
   - Select "UPI" as the payment type
   - Enter your UPI VPA (Virtual Payment Address)
   - **IMPORTANT**: Name this configuration exactly as "PitZone_Upi"
   - Save the configuration
6. These configuration names are hardcoded in the application code

## 4. Testing the Integration

You can test the WhatsApp payment integration using the provided test scripts:

1. `node test-payment-integration.js` - Tests the payment message generation
2. `node test-payment-buttons.js` - Tests sending actual payment buttons

## 5. Payment Flow Implementation

The payment flow has been implemented as follows:

1. User completes the WhatsApp Flow for booking
2. System sends payment options using the WhatsApp Payment API
3. User selects a payment method (Razorpay or UPI)
4. System generates the appropriate payment message with the correct configuration
5. User completes the payment
6. Payment gateway sends webhook notifications
7. System updates the booking status and sends confirmation

## 6. Troubleshooting

If you encounter issues with the payment integration:

1. **Check Configuration Names**: Ensure your payment configurations in WhatsApp Business Manager are named exactly as "pitzone_razorpay" and "PitZone_Upi"
2. **Verify API Credentials**: Double-check your Razorpay API credentials and UPI merchant details
3. **Format Phone Numbers**: Ensure phone numbers are properly formatted with country code (e.g., '91' prefix for India)
4. **Check Webhook Responses**: Monitor webhook responses from payment gateways for any error messages
5. **Review Server Logs**: Check your server logs for any error messages related to payment processing

## 7. Important Notes

- WhatsApp Payment API is currently only available in India
- Your WhatsApp Business Account must be approved for payments
- The payment configurations must be properly set up in WhatsApp Business Manager with the exact names specified
- Your server must be accessible via HTTPS for webhook notifications

For more information, refer to the [WhatsApp Business Platform documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/payments-api/payments-in/pg/). 