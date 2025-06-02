/**
 * Check Database Schema Script
 * This script checks the database schema to ensure it's up to date
 * with the application requirements.
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

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
 * Check the database schema
 */
async function checkDatabaseSchema() {
  console.log('Connecting to database...');
  console.log(`Host: ${dbConfig.host}`);
  console.log(`Database: ${dbConfig.database}`);
  console.log(`User: ${dbConfig.user}`);
  
  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');
    
    // Check tables
    console.log('Checking database tables...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, [dbConfig.database]);
    
    const tableNames = tables.map(table => table.TABLE_NAME);
    console.log('Tables found:', tableNames.join(', '));
    
    // Required tables
    const requiredTables = [
      'booking', 'court', 'customer', 'flows_state', 
      'payment', 'sport_config'
    ];
    
    // Check for missing tables
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables.join(', '));
    } else {
      console.log('✅ All required tables exist');
    }
    
    // Check flows_state table columns
    if (tableNames.includes('flows_state')) {
      console.log('Checking flows_state table columns...');
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
          AND TABLE_NAME = 'flows_state'
      `, [dbConfig.database]);
      
      const columnNames = columns.map(col => col.COLUMN_NAME);
      console.log('flows_state columns:', columnNames.join(', '));
      
      // Required columns for flows_state
      const requiredColumns = [
        'id', 'flow_token', 'screen', 'phone_number', 'sport', 'date', 
        'duration', 'time_slot', 'name', 'email', 'total_amount', 
        'original_amount', 'discount_info', 'is_date_enabled', 
        'is_duration_enabled', 'is_time_slots_enabled', 'is_footer_enabled',
        'min_date', 'max_date', 'processed_messages', 'available_slots',
        'selected_slot_id', 'payment_id', 'payment_status', 'booking_id',
        'language', 'created_at', 'updated_at'
      ];
      
      // Check for missing columns
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      if (missingColumns.length > 0) {
        console.log('❌ Missing columns in flows_state:', missingColumns.join(', '));
      } else {
        console.log('✅ All required columns exist in flows_state');
      }
      
      // Check for unused columns
      const unusedColumns = columnNames.filter(col => !requiredColumns.includes(col));
      if (unusedColumns.length > 0) {
        console.log('⚠️ Unused columns in flows_state:', unusedColumns.join(', '));
      } else {
        console.log('✅ No unused columns in flows_state');
      }
    }
    
    console.log('✅ Database schema check completed');
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error);
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
    
    // Check database schema
    await checkDatabaseSchema();
  } catch (error) {
    console.error('Failed to check database schema:', error);
    process.exit(1);
  }
}

// Run the script
main(); 