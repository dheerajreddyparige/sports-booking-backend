/**
 * Test Time Slot Script
 * This script tests that time_slot is properly handled as a string
 */

const dotenv = require('dotenv');
const { saveFlowState, getFlowState } = require('../utils/flowDbUtils');

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' }); // Try to load from .env.local as well

/**
 * Test time slot handling
 */
async function testTimeSlot() {
  console.log('Testing time_slot handling...');
  
  const testFlowToken = `test-time-slot-${Date.now()}`;
  const testScreen = 'TEST_SCREEN';
  const testTimeSlot = '10:00 AM-12:00 PM'; // Simple string format
  
  const testData = {
    sport: 'badminton',
    date: '2025-06-03',
    duration: '2',
    time_slot: testTimeSlot,
    name: 'Test User',
    phone: '1234567890',
    email: 'test@example.com'
  };
  
  try {
    // Save flow state
    console.log('\nSaving flow state with time_slot as string...');
    const savedState = await saveFlowState(testFlowToken, testScreen, testData);
    console.log('Saved time_slot value:', savedState.timeSlot);
    
    // Get flow state
    console.log('\nRetrieving flow state...');
    const retrievedState = await getFlowState(testFlowToken);
    console.log('Retrieved time_slot value:', retrievedState.time_slot);
    
    // Check if time_slot was properly saved and retrieved
    console.log('\nChecking if time_slot was properly saved and retrieved...');
    if (retrievedState.time_slot === testTimeSlot) {
      console.log('✅ time_slot was properly saved and retrieved as a string');
    } else {
      console.log('❌ time_slot mismatch:', { 
        original: testTimeSlot, 
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
testTimeSlot()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 