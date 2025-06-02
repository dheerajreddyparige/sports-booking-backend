/**
 * SQL Dump Generator
 * This script reads all SQL files in the models/sql directory
 * and generates a single SQL dump file that can be imported into MySQL.
 */

const fs = require('fs');
const path = require('path');

// Path to SQL files
const sqlDir = path.join(__dirname, '..', 'models', 'sql');
const outputFile = path.join(__dirname, '..', '..', 'database_dump.sql');

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
 * Generate SQL dump file
 * @param {Array} sqlFiles - Array of {name, content} objects
 */
async function generateSqlDump(sqlFiles) {
  console.log(`Generating SQL dump file: ${outputFile}`);
  
  try {
    // Create database statement
    const createDbStatement = `
-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS sports_booking;
USE sports_booking;

`;
    
    // Combine all SQL files into a single dump file
    let dumpContent = createDbStatement;
    
    for (const file of sqlFiles) {
      dumpContent += `
-- File: ${file.name}
${file.content}

`;
    }
    
    // Write dump file
    await fs.promises.writeFile(outputFile, dumpContent, 'utf8');
    
    console.log(`✅ SQL dump file generated successfully: ${outputFile}`);
    console.log('You can import this file into your MySQL database using:');
    console.log('mysql -u root -p < database_dump.sql');
  } catch (error) {
    console.error('❌ Error generating SQL dump file:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Read SQL files
    const sqlFiles = await readSqlFiles();
    
    // Generate SQL dump
    await generateSqlDump(sqlFiles);
  } catch (error) {
    console.error('Failed to generate SQL dump:', error);
    process.exit(1);
  }
}

// Run the script
main(); 