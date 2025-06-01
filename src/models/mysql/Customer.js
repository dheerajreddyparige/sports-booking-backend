/**
 * Customer Model for MySQL
 * Represents a customer in the sports booking system
 */

const connectToDatabase = require('../../utils/mysql-connection');

class Customer {
  /**
   * Find customers based on filter criteria
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Array>} Array of customer objects
   */
  static async find(filter = {}) {
    const pool = await connectToDatabase();
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    
    // Apply filters
    if (filter.customerId) {
      query += ' AND customer_id = ?';
      params.push(filter.customerId);
    }
    
    if (filter.phoneNumber) {
      query += ' AND phone_number = ?';
      params.push(filter.phoneNumber);
    }
    
    if (filter.whatsappId) {
      query += ' AND whatsapp_id = ?';
      params.push(filter.whatsappId);
    }
    
    if (filter.email) {
      query += ' AND email = ?';
      params.push(filter.email);
    }
    
    if (filter.isActive !== undefined) {
      query += ' AND is_active = ?';
      params.push(filter.isActive);
    }
    
    if (filter.isVerified !== undefined) {
      query += ' AND is_verified = ?';
      params.push(filter.isVerified);
    }
    
    const [rows] = await pool.query(query, params);
    
    // Transform rows to match the expected format from MongoDB
    return Promise.all(rows.map(row => this._transformDbRowToModel(row)));
  }
  
  /**
   * Find a single customer
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Object|null>} Customer object or null if not found
   */
  static async findOne(filter = {}) {
    const pool = await connectToDatabase();
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    
    // Apply filters
    if (filter.customerId) {
      query += ' AND customer_id = ?';
      params.push(filter.customerId);
    }
    
    if (filter.phoneNumber) {
      query += ' AND phone_number = ?';
      params.push(filter.phoneNumber);
    }
    
    if (filter.whatsappId) {
      query += ' AND whatsapp_id = ?';
      params.push(filter.whatsappId);
    }
    
    if (filter.email) {
      query += ' AND email = ?';
      params.push(filter.email);
    }
    
    if (filter.isActive !== undefined) {
      query += ' AND is_active = ?';
      params.push(filter.isActive);
    }
    
    if (filter.isVerified !== undefined) {
      query += ' AND is_verified = ?';
      params.push(filter.isVerified);
    }
    
    query += ' LIMIT 1';
    
    const [rows] = await pool.query(query, params);
    
    if (rows.length === 0) {
      return null;
    }
    
    return this._transformDbRowToModel(rows[0]);
  }
  
  /**
   * Find a customer by ID
   * @param {number} id - Customer ID
   * @returns {Promise<Object|null>} Customer object or null if not found
   */
  static async findById(id) {
    const pool = await connectToDatabase();
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return this._transformDbRowToModel(rows[0]);
  }
  
  /**
   * Create a new customer
   * @param {Object} customerData - Customer data
   * @returns {Promise<Object>} Created customer object
   */
  static async create(customerData) {
    const pool = await connectToDatabase();
    const {
      customerId,
      firstName,
      lastName,
      phoneNumber,
      email,
      whatsappId,
      preferences = {},
      isActive = true,
      isVerified = false
    } = customerData;
    
    // Insert customer
    const [result] = await pool.query(
      `INSERT INTO customers (
        customer_id, first_name, last_name, phone_number, email, whatsapp_id, 
        is_active, is_verified, last_activity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        customerId || `CUST${Date.now()}`,
        firstName,
        lastName,
        phoneNumber,
        email,
        whatsappId,
        isActive,
        isVerified
      ]
    );
    
    const customerId_db = result.insertId;
    
    // Insert preferences if provided
    if (preferences && Object.keys(preferences).length > 0) {
      for (const [key, value] of Object.entries(preferences)) {
        await pool.query(
          'INSERT INTO customer_preferences (customer_id, preference_key, preference_value) VALUES (?, ?, ?)',
          [customerId_db, key, value]
        );
      }
    }
    
    // Return the created customer
    return this.findById(customerId_db);
  }
  
  /**
   * Update a customer
   * @param {number} id - Customer ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated customer object
   */
  static async update(id, updateData) {
    const pool = await connectToDatabase();
    const updates = [];
    const params = [];
    
    // Handle simple field updates
    const simpleFields = {
      customerId: 'customer_id',
      firstName: 'first_name',
      lastName: 'last_name',
      phoneNumber: 'phone_number',
      email: 'email',
      whatsappId: 'whatsapp_id',
      isActive: 'is_active',
      isVerified: 'is_verified'
    };
    
    for (const [jsField, dbField] of Object.entries(simpleFields)) {
      if (updateData[jsField] !== undefined) {
        updates.push(`${dbField} = ?`);
        params.push(updateData[jsField]);
      }
    }
    
    // Update last activity if specified
    if (updateData.lastActivity) {
      updates.push('last_activity = NOW()');
    }
    
    if (updates.length === 0 && !updateData.preferences) {
      return this.findById(id);
    }
    
    // Update customer if there are field updates
    if (updates.length > 0) {
      params.push(id);
      await pool.query(
        `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }
    
    // Handle preferences if provided
    if (updateData.preferences) {
      // Get existing preferences
      const [existingPrefs] = await pool.query(
        'SELECT preference_key FROM customer_preferences WHERE customer_id = ?',
        [id]
      );
      
      const existingKeys = new Set(existingPrefs.map(p => p.preference_key));
      
      // Update or insert preferences
      for (const [key, value] of Object.entries(updateData.preferences)) {
        if (existingKeys.has(key)) {
          await pool.query(
            'UPDATE customer_preferences SET preference_value = ? WHERE customer_id = ? AND preference_key = ?',
            [value, id, key]
          );
        } else {
          await pool.query(
            'INSERT INTO customer_preferences (customer_id, preference_key, preference_value) VALUES (?, ?, ?)',
            [id, key, value]
          );
        }
      }
    }
    
    // Get the updated customer
    return this.findById(id);
  }
  
  /**
   * Delete a customer
   * @param {number} id - Customer ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async delete(id) {
    const pool = await connectToDatabase();
    
    // Delete preferences first (due to foreign key constraint)
    await pool.query('DELETE FROM customer_preferences WHERE customer_id = ?', [id]);
    
    // Delete customer
    const [result] = await pool.query('DELETE FROM customers WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
  
  /**
   * Transform a database row to a model object
   * @param {Object} row - Database row
   * @returns {Promise<Object>} Model object
   * @private
   */
  static async _transformDbRowToModel(row) {
    const pool = await connectToDatabase();
    
    // Get customer preferences
    const [preferences] = await pool.query(
      'SELECT preference_key, preference_value FROM customer_preferences WHERE customer_id = ?',
      [row.id]
    );
    
    // Convert preferences to object
    const preferencesObj = {};
    for (const pref of preferences) {
      preferencesObj[pref.preference_key] = pref.preference_value;
    }
    
    // Get booking history (count only)
    const [bookingCount] = await pool.query(
      'SELECT COUNT(*) as count FROM bookings WHERE customer_id = ?',
      [row.id]
    );
    
    // Get payment history (count only)
    const [paymentCount] = await pool.query(
      'SELECT COUNT(*) as count FROM payment_history WHERE customer_id = ?',
      [row.id]
    );
    
    return {
      id: row.id,
      customerId: row.customer_id,
      firstName: row.first_name,
      lastName: row.last_name,
      phoneNumber: row.phone_number,
      email: row.email,
      whatsappId: row.whatsapp_id,
      bookingCount: bookingCount[0].count,
      paymentCount: paymentCount[0].count,
      preferences: preferencesObj,
      isActive: Boolean(row.is_active),
      isVerified: Boolean(row.is_verified),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActivity: row.last_activity
    };
  }
}

module.exports = Customer;