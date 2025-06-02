/**
 * Save Database Credentials Script
 * This script saves database credentials to a local .env file
 * for future use.
 */

const fs = require('fs');
const path = require('path');

/**
 * Prompt for database credentials
 */
async function promptForCredentials() {
  console.log('Please enter your database credentials:');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise((resolve) => readline.question(query, resolve));
  
  const dbHost = await question('Database Host: ');
  const dbPort = await question('Database Port (default: 3306): ') || '3306';
  const dbUser = await question('Database User: ');
  const dbPassword = await question('Database Password: ');
  const dbName = await question('Database Name: ');
  
  readline.close();
  
  return {
    dbHost,
    dbPort,
    dbUser,
    dbPassword,
    dbName
  };
}

/**
 * Save credentials to .env file
 * @param {Object} credentials - Database credentials
 */
async function saveCredentialsToEnvFile(credentials) {
  const envFilePath = path.join(__dirname, '..', '..', '.env.local');
  
  // Create .env file content
  const envContent = `# Database Configuration
DB_HOST=${credentials.dbHost}
DB_PORT=${credentials.dbPort}
DB_USER=${credentials.dbUser}
DB_PASSWORD=${credentials.dbPassword}
DB_NAME=${credentials.dbName}

# Server Configuration
PORT=3000
NODE_ENV=development
`;
  
  // Write to .env file
  try {
    await fs.promises.writeFile(envFilePath, envContent, 'utf8');
    console.log(`✅ Database credentials saved to ${envFilePath}`);
  } catch (error) {
    console.error('❌ Error saving credentials:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Prompt for credentials
    const credentials = await promptForCredentials();
    
    // Save credentials to .env file
    await saveCredentialsToEnvFile(credentials);
    
    console.log('✅ You can now use the database scripts without entering credentials each time');
  } catch (error) {
    console.error('Failed to save database credentials:', error);
    process.exit(1);
  }
}

// Run the script
main(); 