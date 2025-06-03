/**
 * Test Flow State Database
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testFlowStateTable() {
  let connection;
  try {
    // Create connection using the correct environment variables
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sports_booking'
    });

    console.log('✅ Successfully connected to database');

    // Check if flows_state table exists
    const [tables] = await connection.query('SHOW TABLES');
    const flowsStateTableExists = tables.some(table => {
      const tableName = Object.values(table)[0];
      return tableName === 'flows_state';
    });

    if (flowsStateTableExists) {
      console.log('✅ flows_state table exists, checking structure...');
      const [columns] = await connection.query('DESCRIBE flows_state');
      console.log('📋 flows_state table columns:');
      columns.forEach(column => {
        console.log(`- ${column.Field} (${column.Type})`);
      });

      // Check for existing records
      const [records] = await connection.query('SELECT * FROM flows_state LIMIT 5');
      console.log(`📋 Found ${records.length} flow state records:`);
      records.forEach(record => {
        console.log(JSON.stringify(record, null, 2));
      });

      // Check for column names
      const phoneNumberColumn = columns.find(col => 
        col.Field === 'phoneNumber' || col.Field === 'phone_number'
      );
      
      if (phoneNumberColumn) {
        console.log(`✅ Phone number column found: ${phoneNumberColumn.Field}`);
      } else {
        console.log('⚠️ No phone number column found in flows_state table');
      }

    } else {
      console.log('⚠️ flows_state table does not exist');
    }

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

testFlowStateTable(); 