/**
 * Remote Database Update Script
 * This script connects to the remote database and updates the schema
 * by executing the SQL files in the models/sql directory.
 */

const fs = require('fs');
const path = require('path');
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

// Path to SQL files
const sqlDir = path.join(__dirname, '..', 'models', 'sql');

/**
 * Read all SQL files from the models/sql directory
 * @returns {Promise<Array>} Array of {name, content} objects
 */
async function readSqlFiles() {
  console.log(`Reading SQL files from ${sqlDir}...`);
  
  try {
    // Read directory
    const files = await fs.promises.readdir(sqlDir);
    
    // Filter for .sql files and read their contents
    const sqlFiles = await Promise.all(
      files
        .filter(file => file.endsWith('.sql'))
        .map(async file => {
          const filePath = path.join(sqlDir, file);
          const content = await fs.promises.readFile(filePath, 'utf8');
          return { name: file, content };
        })
    );
    
    console.log(`Found ${sqlFiles.length} SQL files`);
    return sqlFiles;
  } catch (error) {
    console.error('Error reading SQL files:', error);
    throw error;
  }
}

/**
 * Execute SQL statements to update the database
 * @param {Array} sqlFiles - Array of {name, content} objects
 */
async function updateDatabase(sqlFiles) {
  console.log('Connecting to remote database...');
  console.log(`Host: ${dbConfig.host}`);
  console.log(`Database: ${dbConfig.database}`);
  console.log(`User: ${dbConfig.user}`);
  
  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to remote database');
    
    // Execute each SQL file
    for (const file of sqlFiles) {
      console.log(`Executing ${file.name}...`);
      try {
        await connection.query(file.content);
        console.log(`✅ ${file.name} executed successfully`);
      } catch (error) {
        console.error(`❌ Error executing ${file.name}:`, error.message);
        // Continue with other files even if one fails
      }
    }
    
    console.log('✅ Database update completed');
  } catch (error) {
    console.error('❌ Error connecting to remote database:', error);
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
    
    // Read SQL files
    const sqlFiles = await readSqlFiles();
    
    // Update database
    await updateDatabase(sqlFiles);
  } catch (error) {
    console.error('Failed to update remote database:', error);
    process.exit(1);
  }
}

// Run the script
main(); 