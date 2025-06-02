/**
 * Migration script to add language column to flows_state table
 */

const connectToDatabase = require('./mysql-connection');

async function runMigration() {
  console.log('🔄 Starting migration: Adding language column to flows_state table...');
  
  try {
    const pool = await connectToDatabase();
    
    // Check if language column exists
    const [columns] = await pool.query(`
      SHOW COLUMNS FROM flows_state LIKE 'language'
    `);
    
    if (columns.length > 0) {
      console.log('✅ Language column already exists in flows_state table');
      return;
    }
    
    // Add language column
    await pool.query(`
      ALTER TABLE flows_state 
      ADD COLUMN language VARCHAR(10) DEFAULT 'en' AFTER booking_id
    `);
    
    console.log('✅ Successfully added language column to flows_state table');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = runMigration; 