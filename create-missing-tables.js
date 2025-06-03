/**
 * Script to create missing database tables
 * Specifically for customer_preferences table that's causing errors
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function createMissingTables() {
  let connection;
  try {
    // Connect to database
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sportsdb',
    });
    
    console.log('Connected to database successfully');

    // Check if customer_preferences table exists
    console.log('Checking if customer_preferences table exists...');
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'customer_preferences'"
    );

    if (tables.length === 0) {
      console.log('Creating customer_preferences table...');
      
      // Create customer_preferences table
      await connection.execute(`
        CREATE TABLE customer_preferences (
          id INT NOT NULL AUTO_INCREMENT,
          customer_id INT NOT NULL,
          preference_key VARCHAR(100) NOT NULL,
          preference_value TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY unique_customer_preference (customer_id, preference_key),
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `);
      
      console.log('✅ customer_preferences table created successfully');
    } else {
      // Check if the table has the correct columns
      console.log('Checking if customer_preferences table has the correct columns...');
      const [columns] = await connection.execute(
        "SHOW COLUMNS FROM customer_preferences LIKE 'preference_key'"
      );
      
      if (columns.length === 0) {
        console.log('Adding missing columns to customer_preferences table...');
        // Add missing columns
        await connection.execute(`
          ALTER TABLE customer_preferences 
          ADD COLUMN preference_key VARCHAR(100) NOT NULL AFTER customer_id,
          ADD COLUMN preference_value TEXT AFTER preference_key,
          ADD UNIQUE KEY unique_customer_preference (customer_id, preference_key)
        `);
        
        console.log('✅ Missing columns added to customer_preferences table');
      } else {
        console.log('✅ customer_preferences table is correctly configured');
      }
    }

    // Check if razorpay_order_id column exists in bookings table
    console.log('Checking if razorpay_order_id column exists in bookings table...');
    const [bookingColumns] = await connection.execute(
      "SHOW COLUMNS FROM bookings LIKE 'razorpay_order_id'"
    );

    if (bookingColumns.length === 0) {
      console.log('Adding razorpay_order_id column to bookings table...');
      // Add razorpay_order_id column
      await connection.execute(`
        ALTER TABLE bookings 
        ADD COLUMN razorpay_order_id VARCHAR(100) NULL AFTER transaction_id
      `);
      
      console.log('✅ razorpay_order_id column added to bookings table');
    } else {
      console.log('✅ razorpay_order_id column already exists in bookings table');
    }
    
    // Check the customers table for phone field naming
    console.log('Checking columns in customers table...');
    try {
      // Check if phone field exists
      const [phoneColumn] = await connection.execute(
        "SHOW COLUMNS FROM customers LIKE 'phone'"
      );
      
      const [phoneNumberColumn] = await connection.execute(
        "SHOW COLUMNS FROM customers LIKE 'phone_number'"
      );
      
      // If phone_number column doesn't exist but phone does, rename it
      if (phoneNumberColumn.length === 0 && phoneColumn.length > 0) {
        console.log('Renaming phone column to phone_number...');
        await connection.execute(`
          ALTER TABLE customers 
          CHANGE COLUMN phone phone_number VARCHAR(20)
        `);
        console.log('✅ Renamed phone column to phone_number');
      } 
      // If neither column exists, add phone_number
      else if (phoneNumberColumn.length === 0 && phoneColumn.length === 0) {
        console.log('Adding phone_number column to customers table...');
        await connection.execute(`
          ALTER TABLE customers 
          ADD COLUMN phone_number VARCHAR(20) AFTER email
        `);
        console.log('✅ Added phone_number column to customers table');
      } else {
        console.log('✅ Customers table has correct phone column structure');
      }
      
      // Check for last_activity column
      const [lastActivityColumn] = await connection.execute(
        "SHOW COLUMNS FROM customers LIKE 'last_activity'"
      );
      
      // Check for last_login column
      const [lastLoginColumn] = await connection.execute(
        "SHOW COLUMNS FROM customers LIKE 'last_login'"
      );
      
      // Check for login_count column
      const [loginCountColumn] = await connection.execute(
        "SHOW COLUMNS FROM customers LIKE 'login_count'"
      );
      
      // Add any missing activity columns
      if (lastActivityColumn.length === 0) {
        console.log('Adding last_activity column to customers table...');
        await connection.execute(`
          ALTER TABLE customers 
          ADD COLUMN last_activity DATETIME NULL AFTER account_status
        `);
        console.log('✅ Added last_activity column to customers table');
      }
      
      if (lastLoginColumn.length === 0) {
        console.log('Adding last_login column to customers table...');
        await connection.execute(`
          ALTER TABLE customers 
          ADD COLUMN last_login DATETIME NULL AFTER last_activity
        `);
        console.log('✅ Added last_login column to customers table');
      }
      
      if (loginCountColumn.length === 0) {
        console.log('Adding login_count column to customers table...');
        await connection.execute(`
          ALTER TABLE customers 
          ADD COLUMN login_count INT DEFAULT 0 AFTER last_login
        `);
        console.log('✅ Added login_count column to customers table');
      }
      
    } catch (error) {
      console.error('Error checking/fixing customers table:', error);
    }

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the script
createMissingTables().catch(console.error); 