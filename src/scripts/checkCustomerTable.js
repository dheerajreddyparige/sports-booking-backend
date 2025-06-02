/**
 * Check Customer Table Script
 * This script checks the structure of the customers table
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
 * Check the customers table structure
 */
async function checkCustomerTable() {
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
    
    console.log('Customers table columns:');
    columns.forEach(column => {
      console.log(`- ${column.Field} (${column.Type})${column.Key === 'PRI' ? ' PRIMARY KEY' : ''}`);
    });
    
    console.log('\nSample data from customers table:');
    const [rows] = await connection.query('SELECT * FROM customers LIMIT 1');
    console.log(rows);
    
  } catch (error) {
    console.error('❌ Error checking customers table:', error);
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
    
    // Check customers table
    await checkCustomerTable();
  } catch (error) {
    console.error('Failed to check customers table:', error);
    process.exit(1);
  }
}

// Run the script
main(); 