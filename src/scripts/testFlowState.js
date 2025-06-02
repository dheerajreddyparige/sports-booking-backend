/**
 * Test Flow State Script
 * This script tests the flow state functionality with our fixes
 */

const dotenv = require('dotenv');
const { saveFlowState, getFlowState } = require('../utils/flowDbUtils');

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' }); // Try to load from .env.local as well

/**
 * Test the flow state functionality
 */
async function testFlowState() {
  console.log('Testing flow state functionality...');
  
  const testFlowToken = `test-flow-${Date.now()}`;
  const testScreen = 'TEST_SCREEN';
  const testData = {
    sport: 'badminton',
    date: '2025-06-03',
    duration: '2',
    time_slot: '10:00 AM-12:00 PM',
    name: 'Test User',
    phone: '1234567890',
    email: 'test@example.com',
    total_amount: '800',
    original_amount: '800',
    discount_info: '5% bulk booking discount',
    is_date_enabled: true,
    is_duration_enabled: true,
    is_time_slots_enabled: true,
    is_footer_enabled: true,
    min_date: '2025-06-03',
    max_date: '2025-06-10'
  };
  
  // Log database connection info
  console.log('Database connection info:');
  console.log(`- Host: ${process.env.DB_HOST}`);
  console.log(`- Database: ${process.env.DB_NAME}`);
  console.log(`- User: ${process.env.DB_USER}`);
  
  try {
    // Save flow state
    console.log('\nSaving flow state...');
    const savedState = await saveFlowState(testFlowToken, testScreen, testData);
    console.log('Saved flow state:', savedState);
    
    // Get flow state
    console.log('\nRetrieving flow state...');
    const retrievedState = await getFlowState(testFlowToken);
    console.log('Retrieved flow state:', retrievedState);
    
    // Check if duration was properly saved and retrieved
    console.log('\nChecking if duration was properly saved and retrieved...');
    // Convert both to strings for comparison
    const originalDuration = String(testData.duration);
    const retrievedDuration = String(retrievedState.duration);
    if (originalDuration === retrievedDuration) {
      console.log('✅ Duration was properly saved and retrieved');
    } else {
      console.log('❌ Duration mismatch:', { 
        original: testData.duration, 
        saved: savedState.duration, 
        retrieved: retrievedState.duration 
      });
    }
    
    // Check if phone was properly saved and retrieved
    console.log('\nChecking if phone was properly saved and retrieved...');
    if (retrievedState.phone === testData.phone) {
      console.log('✅ Phone was properly saved and retrieved');
    } else {
      console.log('❌ Phone mismatch:', { 
        original: testData.phone, 
        saved: savedState.phoneNumber, 
        retrieved: retrievedState.phone 
      });
    }
    
    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testFlowState()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 