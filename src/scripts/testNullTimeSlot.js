/**
 * Test Null Time Slot Script
 * This script tests that null time_slot values are properly handled
 */

const dotenv = require('dotenv');
const { saveFlowState, getFlowState } = require('../utils/flowDbUtils');

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' }); // Try to load from .env.local as well

/**
 * Test null time slot handling
 */
async function testNullTimeSlot() {
  console.log('Testing null time_slot handling...');
  
  const testFlowToken = `test-null-time-slot-${Date.now()}`;
  const testScreen = 'TEST_SCREEN';
  
  // Create test data with null time_slot
  const testData = {
    sport: 'badminton',
    date: '2025-06-03',
    duration: '2',
    time_slot: null, // Explicitly null
    name: 'Test User',
    phone: '1234567890',
    email: 'test@example.com'
  };
  
  try {
    // Save flow state with null time_slot
    console.log('\nSaving flow state with null time_slot...');
    const savedState = await saveFlowState(testFlowToken, testScreen, testData);
    console.log('Saved time_slot value:', savedState.timeSlot);
    
    // Get flow state
    console.log('\nRetrieving flow state...');
    const retrievedState = await getFlowState(testFlowToken);
    console.log('Retrieved time_slot value:', retrievedState.time_slot);
    
    // Check if time_slot was properly saved and retrieved as empty string
    console.log('\nChecking if null time_slot was properly handled...');
    if (retrievedState.time_slot === "") {
      console.log('✅ Null time_slot was properly saved as empty string');
    } else {
      console.log('❌ time_slot handling issue:', { 
        original: null, 
        saved: savedState.timeSlot, 
        retrieved: retrievedState.time_slot 
      });
    }
    
    // Check the type of the retrieved time_slot
    console.log('\nChecking the type of the retrieved time_slot...');
    console.log('Type of retrieved time_slot:', typeof retrievedState.time_slot);
    
    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testNullTimeSlot()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 