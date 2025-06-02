/**
 * Test Customer Creation Script
 * This script tests the customer creation functionality
 */

const dotenv = require('dotenv');
const { createOrUpdateCustomer } = require('../utils/flowDbUtils');

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' }); // Try to load from .env.local as well

/**
 * Test customer creation
 */
async function testCustomerCreation() {
  console.log('Testing customer creation functionality...');
  
  const testCustomer = {
    name: 'Test Customer',
    phone: '9876543210',
    email: 'test.customer@example.com',
    whatsappId: null
  };
  
  try {
    // Create customer
    console.log('Creating test customer...');
    const createdCustomer = await createOrUpdateCustomer(testCustomer);
    
    if (createdCustomer) {
      console.log('✅ Customer created successfully:', createdCustomer);
    } else {
      console.log('❌ Failed to create customer');
    }
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testCustomerCreation()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 