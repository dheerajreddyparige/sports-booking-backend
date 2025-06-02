/**
 * Fix Customer Table Script
 * This script updates the customers table structure to match the application's requirements
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
 * Fix the customers table structure
 */
async function fixCustomerTable() {
  console.log('Connecting to database...');
  console.log(`Host: ${dbConfig.host}`);
  console.log(`Database: ${dbConfig.database}`);
  console.log(`User: ${dbConfig.user}`);
  
  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');
    
    // Check customers table structure
    console.log('Checking customers table structure...');
    const [columns] = await connection.query('DESCRIBE customers');
    
    const columnNames = columns.map(col => col.Field);
    console.log('Current columns:', columnNames.join(', '));
    
    // Add required columns if they don't exist
    const requiredColumns = [
      { name: 'name', type: 'VARCHAR(100)', after: 'customer_id' },
      { name: 'phone', type: 'VARCHAR(20)', after: 'name' },
      { name: 'email', type: 'VARCHAR(100)', after: 'phone' },
      { name: 'whatsapp_id', type: 'VARCHAR(100)', after: 'email' }
    ];
    
    for (const column of requiredColumns) {
      if (!columnNames.includes(column.name)) {
        console.log(`Adding ${column.name} column...`);
        
        // If the 'after' column doesn't exist, add to the end of the table
        let alterQuery;
        if (columnNames.includes(column.after)) {
          alterQuery = `ALTER TABLE customers ADD COLUMN ${column.name} ${column.type} AFTER ${column.after}`;
        } else {
          alterQuery = `ALTER TABLE customers ADD COLUMN ${column.name} ${column.type}`;
        }
        
        try {
          await connection.query(alterQuery);
          console.log(`✅ ${column.name} column added successfully`);
          columnNames.push(column.name); // Update our list of columns
        } catch (error) {
          console.error(`❌ Error adding ${column.name} column:`, error.message);
        }
      } else {
        console.log(`✅ ${column.name} column already exists`);
      }
    }
    
    console.log('✅ Customer table structure updated successfully');
    
  } catch (error) {
    console.error('❌ Error fixing customer table:', error);
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
    
    // Fix customer table
    await fixCustomerTable();
  } catch (error) {
    console.error('Failed to fix customer table:', error);
    process.exit(1);
  }
}

// Run the script
main(); 