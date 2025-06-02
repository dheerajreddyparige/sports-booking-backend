/**
 * MySQL database connection module
 * Provides a shared connection pool for database operations
 */

const mysql = require('mysql2/promise');
const connectToDatabase = require('../../utils/mysql-connection');

// Export a proxy that ensures the pool exists before executing queries
module.exports = {
  /**
   * Execute a SQL query
   * @param {string} query - SQL query to execute
   * @param {Array} values - Parameter values for the query
   * @returns {Promise<Array>} - Query results
   */
  async execute(query, values) {
    const pool = await connectToDatabase();
    return pool.execute(query, values);
  },
  
  /**
   * Get a connection from the pool
   * @returns {Promise<Connection>} - MySQL connection
   */
  async getConnection() {
    const pool = await connectToDatabase();
    return pool.getConnection();
  },
  
  /**
   * Execute a query using a transaction
   * @param {Function} callback - Callback function that receives a connection
   * @returns {Promise<any>} - Result of the callback function
   */
  async transaction(callback) {
    const pool = await connectToDatabase();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}; 