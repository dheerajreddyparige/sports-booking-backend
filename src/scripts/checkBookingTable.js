/**
 * Check Booking Table Script
 * This script checks the structure of the bookings table
 */

const dotenv = require('dotenv');
const connectToDatabase = require('../utils/mysql-connection');

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' }); // Try to load from .env.local as well

/**
 * Check the structure of the bookings table
 */
async function checkBookingTable() {
  console.log('Checking bookings table structure...');
  
  try {
    // Connect to database
    const pool = await connectToDatabase();
    
    // Check if bookings table exists
    const [tables] = await pool.query('SHOW TABLES LIKE "bookings"');
    
    if (tables.length === 0) {
      console.log('⚠️ Bookings table does not exist');
      return;
    }
    
    // Get table structure
    const [columns] = await pool.query('DESCRIBE bookings');
    
    console.log('Bookings table structure:');
    columns.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type} ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check for sample data
    const [rows] = await pool.query('SELECT * FROM bookings LIMIT 5');
    
    console.log(`\nFound ${rows.length} booking records`);
    
    if (rows.length > 0) {
      console.log('Sample booking record:');
      console.log(rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error checking bookings table:', error);
  }
}

// Run the check
checkBookingTable()
  .then(() => {
    console.log('\nCheck completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Check failed:', error);
    process.exit(1);
  }); 