/**
 * Remove Unused Columns Script
 * This script checks for and removes unused columns from the flows_state table
 * in the remote database.
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' }); // Try to load from .env.local as well

// Get database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : undefined
};

/**
 * Remove unused columns from the flows_state table
 */
async function removeUnusedColumns() {
  console.log('Connecting to remote database...');
  console.log(`Host: ${dbConfig.host}`);
  console.log(`Database: ${dbConfig.database}`);
  console.log(`User: ${dbConfig.user}`);
  
  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to remote database');
    
    // Check existing columns
    console.log('Checking existing columns in flows_state table...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'flows_state'
    `, [dbConfig.database]);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    console.log('Existing columns:', existingColumns.join(', '));
    
    // List of columns that are used in the application
    const usedColumns = [
      'id', 'flow_token', 'screen', 'phone_number', 'sport', 'date', 
      'duration', 'time_slot', 'name', 'email', 'total_amount', 
      'original_amount', 'discount_info', 'is_date_enabled', 
      'is_duration_enabled', 'is_time_slots_enabled', 'is_footer_enabled',
      'min_date', 'max_date', 'processed_messages', 'available_slots',
      'selected_slot_id', 'payment_id', 'payment_status', 'booking_id',
      'language', 'created_at', 'updated_at'
    ];
    
    // Find unused columns
    const unusedColumns = existingColumns.filter(col => !usedColumns.includes(col));
    
    if (unusedColumns.length === 0) {
      console.log('✅ No unused columns found in the flows_state table');
      return;
    }
    
    console.log('Found unused columns:', unusedColumns.join(', '));
    
    // Confirm before removing columns
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise((resolve) => {
      readline.question(`Do you want to remove these unused columns? (yes/no): `, resolve);
    });
    
    readline.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Column removal cancelled');
      return;
    }
    
    // Remove unused columns
    for (const column of unusedColumns) {
      console.log(`Removing ${column} column from flows_state table...`);
      try {
        await connection.query(`
          ALTER TABLE flows_state 
          DROP COLUMN ${column}
        `);
        console.log(`✅ ${column} column removed successfully`);
      } catch (error) {
        console.error(`❌ Error removing ${column} column:`, error.message);
      }
    }
    
    console.log('✅ Unused columns removed successfully');
    
  } catch (error) {
    console.error('❌ Error removing unused columns:', error);
    throw error;
  } finally {
    // Close connection
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

/**
 * Prompt for database credentials if not provided in environment variables
 */
async function promptForCredentials() {
  // If we're missing any required credentials, prompt for them
  if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
    console.log('Please enter your Hostinger database credentials:');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const question = (query) => new Promise((resolve) => readline.question(query, resolve));
    
    if (!dbConfig.host) {
      dbConfig.host = await question('Database Host: ');
    }
    
    if (!dbConfig.user) {
      dbConfig.user = await question('Database User: ');
    }
    
    if (!dbConfig.password) {
      dbConfig.password = await question('Database Password: ');
    }
    
    if (!dbConfig.database) {
      dbConfig.database = await question('Database Name: ');
    }
    
    readline.close();
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Prompt for credentials if needed
    await promptForCredentials();
    
    // Remove unused columns
    await removeUnusedColumns();
  } catch (error) {
    console.error('Failed to remove unused columns:', error);
    process.exit(1);
  }
}

// Run the script
main(); 