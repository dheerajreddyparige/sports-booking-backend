/**
 * Update Time Slot Column Script
 * This script updates the time_slot column in the flows_state table from JSON to VARCHAR
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
 * Update the time_slot column in the flows_state table
 */
async function updateTimeSlotColumn() {
  console.log('Connecting to database...');
  console.log(`Host: ${dbConfig.host}`);
  console.log(`Database: ${dbConfig.database}`);
  console.log(`User: ${dbConfig.user}`);
  
  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');
    
    // Check the current column type
    console.log('Checking time_slot column type...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'flows_state'
        AND COLUMN_NAME = 'time_slot'
    `, [dbConfig.database]);
    
    if (columns.length === 0) {
      console.log('❌ time_slot column not found');
      return;
    }
    
    const currentType = columns[0].DATA_TYPE.toUpperCase();
    console.log(`Current time_slot column type: ${currentType}`);
    
    if (currentType === 'VARCHAR') {
      console.log('✅ time_slot column is already VARCHAR, no changes needed');
      return;
    }
    
    // Fetch all existing records to convert JSON values to strings
    console.log('Fetching existing records...');
    const [rows] = await connection.query('SELECT id, time_slot FROM flows_state');
    console.log(`Found ${rows.length} records to update`);
    
    // Modify the column type to VARCHAR
    console.log('Modifying time_slot column to VARCHAR(100)...');
    await connection.query('ALTER TABLE flows_state MODIFY COLUMN time_slot VARCHAR(100)');
    console.log('✅ Column type changed to VARCHAR(100)');
    
    // Update each record to convert JSON values to strings
    console.log('Updating existing records...');
    let updatedCount = 0;
    
    for (const row of rows) {
      try {
        if (row.time_slot) {
          // Parse the JSON string to get the value
          const timeSlotValue = typeof row.time_slot === 'string' ? 
            JSON.parse(row.time_slot) : 
            row.time_slot;
          
          // Convert to string if it's not already a string
          const timeSlotString = typeof timeSlotValue === 'string' ? 
            timeSlotValue : 
            JSON.stringify(timeSlotValue);
          
          // Update the record
          await connection.query(
            'UPDATE flows_state SET time_slot = ? WHERE id = ?',
            [timeSlotString, row.id]
          );
          
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating record ${row.id}:`, error.message);
      }
    }
    
    console.log(`✅ Updated ${updatedCount} records successfully`);
    console.log('✅ time_slot column updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating time_slot column:', error);
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
    console.log('Please enter your database credentials:');
    
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
    
    // Update time_slot column
    await updateTimeSlotColumn();
  } catch (error) {
    console.error('Failed to update time_slot column:', error);
    process.exit(1);
  }
}

// Run the script
main(); 