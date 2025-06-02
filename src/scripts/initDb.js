/**
 * Database Initialization Script
 * This script reads and executes all SQL files in the models/sql directory
 * to initialize or update the database schema.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database connection configuration without database name (for initial connection)
const rootDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  multipleStatements: true
};

// Full database configuration with database name
const dbConfig = {
  ...rootDbConfig,
  database: process.env.DB_NAME || 'sports_booking'
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
 * Create database if it doesn't exist
 */
async function createDatabaseIfNotExists() {
  console.log('Connecting to MySQL server...');
  
  let rootConnection;
  try {
    // Create connection without database name
    rootConnection = await mysql.createConnection(rootDbConfig);
    console.log('Connected to MySQL server');
    
    // Create database if it doesn't exist
    const dbName = dbConfig.database;
    console.log(`Creating database ${dbName} if it doesn't exist...`);
    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database ${dbName} is ready`);
  } catch (error) {
    console.error('❌ Error connecting to MySQL server or creating database:', error);
    throw error;
  } finally {
    // Close connection
    if (rootConnection) {
      await rootConnection.end();
      console.log('MySQL server connection closed');
    }
  }
}

/**
 * Execute SQL statements to initialize the database
 * @param {Array} sqlFiles - Array of {name, content} objects
 */
async function initializeDatabase(sqlFiles) {
  console.log(`Connecting to database ${dbConfig.database}...`);
  
  let connection;
  try {
    // Create connection with database name
    connection = await mysql.createConnection(dbConfig);
    console.log(`Connected to database ${dbConfig.database}`);
    
    // Execute each SQL file
    for (const file of sqlFiles) {
      console.log(`Executing ${file.name}...`);
      await connection.query(file.content);
      console.log(`✅ ${file.name} executed successfully`);
    }
    
    console.log('✅ Database initialization completed successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
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
 * Main function
 */
async function main() {
  try {
    // Display connection parameters (without password)
    console.log('Database connection parameters:');
    console.log(`Host: ${rootDbConfig.host}`);
    console.log(`Port: ${rootDbConfig.port}`);
    console.log(`User: ${rootDbConfig.user}`);
    console.log(`Database: ${dbConfig.database}`);
    
    // Create database if it doesn't exist
    await createDatabaseIfNotExists();
    
    // Read SQL files
    const sqlFiles = await readSqlFiles();
    
    // Initialize database
    await initializeDatabase(sqlFiles);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// Run the script
main(); 