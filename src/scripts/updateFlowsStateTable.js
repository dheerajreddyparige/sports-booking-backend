/**
 * Update FlowsState Table Script
 * This script specifically updates the flows_state table in the remote database
 * to add all required fields including min_date and max_date fields.
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
 * Update the flows_state table
 */
async function updateFlowsStateTable() {
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
    
    // List of columns to check and add if missing
    const columnsToAdd = [
      { name: 'name', type: 'VARCHAR(100)', after: 'time_slot' },
      { name: 'email', type: 'VARCHAR(100)', after: 'name' },
      { name: 'total_amount', type: 'VARCHAR(20)', after: 'email' },
      { name: 'original_amount', type: 'VARCHAR(20)', after: 'total_amount' },
      { name: 'discount_info', type: 'VARCHAR(255)', after: 'original_amount' },
      { name: 'is_date_enabled', type: 'BOOLEAN DEFAULT FALSE', after: 'discount_info' },
      { name: 'is_duration_enabled', type: 'BOOLEAN DEFAULT FALSE', after: 'is_date_enabled' },
      { name: 'is_time_slots_enabled', type: 'BOOLEAN DEFAULT FALSE', after: 'is_duration_enabled' },
      { name: 'is_footer_enabled', type: 'BOOLEAN DEFAULT FALSE', after: 'is_time_slots_enabled' },
      { name: 'min_date', type: 'VARCHAR(20)', after: 'is_footer_enabled' },
      { name: 'max_date', type: 'VARCHAR(20)', after: 'min_date' },
      { name: 'language', type: 'VARCHAR(10) DEFAULT \'en\'', after: 'booking_id' }
    ];
    
    // Add each column if it doesn't exist
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`Adding ${column.name} column to flows_state table...`);
        
        // If the 'after' column doesn't exist, add to the end of the table
        let alterQuery;
        if (existingColumns.includes(column.after)) {
          alterQuery = `
            ALTER TABLE flows_state 
            ADD COLUMN ${column.name} ${column.type} AFTER ${column.after}
          `;
        } else {
          alterQuery = `
            ALTER TABLE flows_state 
            ADD COLUMN ${column.name} ${column.type}
          `;
        }
        
        try {
          await connection.query(alterQuery);
          console.log(`✅ ${column.name} column added successfully`);
          existingColumns.push(column.name); // Update our list of existing columns
        } catch (error) {
          console.error(`❌ Error adding ${column.name} column:`, error.message);
        }
      } else {
        console.log(`${column.name} column already exists`);
      }
    }
    
    console.log('✅ flows_state table updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating flows_state table:', error);
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
    
    // Update flows_state table
    await updateFlowsStateTable();
  } catch (error) {
    console.error('Failed to update flows_state table:', error);
    process.exit(1);
  }
}

// Run the script
main(); 