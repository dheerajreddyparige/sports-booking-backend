/**
 * Environment Variables Checker
 * Checks if all required environment variables are set for WhatsApp payment integration
 */
require('dotenv').config();

// Required environment variables
const requiredVars = {
  // WhatsApp API
  'WHATSAPP_ACCESS_TOKEN': 'WhatsApp API access token',
  'WHATSAPP_PHONE_NUMBER_ID': 'WhatsApp phone number ID',
  'WHATSAPP_VERIFY_TOKEN': 'WhatsApp webhook verification token',
  
  // Razorpay
  'RAZORPAY_KEY_ID': 'Razorpay API key ID',
  'RAZORPAY_KEY_SECRET': 'Razorpay API key secret',
  'RAZORPAY_MERCHANT_ID': 'Razorpay merchant ID',
  
  // UPI
  'UPI_MERCHANT_VPA': 'UPI merchant virtual payment address (VPA)',
  'UPI_MERCHANT_NAME': 'UPI merchant name'
};

// Optional environment variables with default values
const optionalVars = {
  'PORT': '3000',
  'NODE_ENV': 'development',
  'WHATSAPP_API_VERSION': 'v18.0'
};

// Check for missing variables
const missingVars = [];
const setVars = [];

console.log('🔍 Checking environment variables...\n');

// Check required variables
for (const [varName, description] of Object.entries(requiredVars)) {
  if (process.env[varName]) {
    setVars.push({ name: varName, description });
  } else {
    missingVars.push({ name: varName, description });
  }
}

// Display results
if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingVars.forEach(({ name, description }) => {
    console.log(`   - ${name}: ${description}`);
  });
  console.log('\nPlease set these variables in your .env file.');
} else {
  console.log('✅ All required environment variables are set!');
}

// Display set variables
console.log('\n📋 Currently set environment variables:');
setVars.forEach(({ name }) => {
  // Mask sensitive values
  const isSensitive = name.includes('TOKEN') || name.includes('SECRET') || name.includes('KEY');
  const value = isSensitive 
    ? process.env[name].substring(0, 4) + '...' + process.env[name].slice(-4) 
    : process.env[name];
  
  console.log(`   - ${name}: ${value}`);
});

// Check optional variables
console.log('\n📋 Optional environment variables:');
for (const [varName, defaultValue] of Object.entries(optionalVars)) {
  const value = process.env[varName] || defaultValue;
  console.log(`   - ${varName}: ${value}${!process.env[varName] ? ' (default)' : ''}`);
}

// Show help message for setting up payment configurations
console.log('\n💡 How to set up payment configurations:');
console.log('1. Go to your WhatsApp Business Manager account');
console.log('2. Navigate to the "Payment Configuration" section under "India" tab');
console.log('3. Set up a Razorpay payment configuration by linking your Razorpay merchant account');
console.log('   - IMPORTANT: Name this configuration exactly as "pitzone_razorpay"');
console.log('4. Set up a UPI payment configuration with your UPI VPA');
console.log('   - IMPORTANT: Name this configuration exactly as "PitZone_Upi"');
console.log('5. These configuration names are hardcoded in the application code\n');

// Exit with error code if missing variables
if (missingVars.length > 0) {
  process.exit(1);
} 