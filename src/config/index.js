/**
 * Application Configuration
 */

require('dotenv').config();

module.exports = {
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'sports_booking',
    port: process.env.MYSQL_PORT || 3306
  },
  
  // WhatsApp configuration
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  },
  
  // Razorpay configuration
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_Bc4hkFLlAlybsG',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'EDUiQbY6opaqsKxDuoyogPlt',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  
  // Flow configuration
  flow: {
    privateKey: process.env.PRIVATE_KEY,
    passphrase: process.env.PASSPHRASE,
  }
};