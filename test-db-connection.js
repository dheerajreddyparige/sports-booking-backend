/**
 * Test database connection and table structure
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabase() {
  let connection;
  try {
    // Create connection using the correct environment variables
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sports_booking'
    });

    console.log('✅ Successfully connected to database');

    // Check tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📋 Tables in database:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`- ${tableName}`);
    });

    // Check if bookings table exists
    const bookingsTableExists = tables.some(table => {
      const tableName = Object.values(table)[0];
      return tableName === 'bookings';
    });

    if (bookingsTableExists) {
      console.log('✅ bookings table exists, checking structure...');
      const [columns] = await connection.query('DESCRIBE bookings');
      console.log('📋 bookings table columns:');
      columns.forEach(column => {
        console.log(`- ${column.Field} (${column.Type})`);
      });

      // Test insert into bookings table with correct column names
      try {
        const testBookingData = {
          sport: 'badminton',
          court_id: 1,
          date: new Date().toISOString().split('T')[0],
          start_time: '17:00:00',
          end_time: '18:00:00',
          duration: 1,
          customer_name: 'Test User',
          customer_email: 'test@example.com',
          customer_phone: '9876543210',
          status: 'pending',
          amount: 400,
          currency: 'INR',
          payment_method: 'razorpay',
          payment_status: 'pending',
          flow_token: `flow_test_${Date.now()}`
        };

        // Build query
        const fields = Object.keys(testBookingData).join(', ');
        const placeholders = Object.keys(testBookingData).map(() => '?').join(', ');
        const values = Object.values(testBookingData);

        // Insert test data
        console.log('🔄 Attempting to insert test data into bookings table...');
        const [result] = await connection.query(
          `INSERT INTO bookings (${fields}) VALUES (${placeholders})`,
          values
        );

        if (result.affectedRows > 0) {
          console.log('✅ Successfully inserted test data into bookings table with ID:', result.insertId);
          
          // Retrieve the inserted data
          const [rows] = await connection.query(
            'SELECT * FROM bookings WHERE id = ?',
            [result.insertId]
          );
          
          console.log('📋 Retrieved test data:', rows[0]);
        } else {
          console.log('❌ Failed to insert test data');
        }
      } catch (insertError) {
        console.error('❌ Error inserting test data:', insertError);
      }
    } else {
      console.log('⚠️ bookings table does not exist. Available tables:');
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`- ${tableName}`);
      });

      // Check if booking (singular) table exists
      const bookingTableExists = tables.some(table => {
        const tableName = Object.values(table)[0];
        return tableName === 'booking';
      });

      if (bookingTableExists) {
        console.log('✅ booking (singular) table exists, checking structure...');
        const [columns] = await connection.query('DESCRIBE booking');
        console.log('📋 booking table columns:');
        columns.forEach(column => {
          console.log(`- ${column.Field} (${column.Type})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

testDatabase(); 