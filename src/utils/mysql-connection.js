const mysql = require('mysql2/promise');

let pool = null;

/**
 * Creates a connection pool to MySQL database
 * @returns {Promise<mysql.Pool>} MySQL connection pool
 */
async function connectToDatabase() {
  if (pool) {
    console.log('Reusing existing MySQL connection pool');
    return pool;
  }

  if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_PASSWORD || !process.env.MYSQL_DATABASE) {
    throw new Error('MySQL connection parameters are not defined in environment variables');
  }

  try {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test the connection
    const connection = await pool.getConnection();
    console.log('New MySQL connection established');
    connection.release();
    
    return pool;
  } catch (err) {
    console.error('MySQL connection error:', err);
    throw err;
  }
}

module.exports = connectToDatabase;