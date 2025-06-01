/**
 * PaymentHistory Model for MySQL
 * Represents payment history records in the sports booking system
 */

const connectToDatabase = require('../../utils/mysql-connection');

class PaymentHistory {
  /**
   * Find payment records based on filter criteria
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Array>} Array of payment history objects
   */
  static async find(filter = {}) {
    const pool = await connectToDatabase();
    let query = `
      SELECT ph.*, c.first_name, c.last_name, c.phone_number, c.email, c.whatsapp_id,
             b.booking_id, b.sport, b.date, b.start_time, b.end_time
      FROM payment_history ph
      LEFT JOIN customers c ON ph.customer_id = c.id
      LEFT JOIN bookings b ON ph.booking_id = b.id
      WHERE 1=1
    `;
    const params = [];
    
    // Apply filters
    if (filter.paymentId) {
      query += ' AND ph.payment_id = ?';
      params.push(filter.paymentId);
    }
    
    if (filter.customerId) {
      query += ' AND ph.customer_id = ?';
      params.push(filter.customerId);
    }
    
    if (filter.bookingId) {
      query += ' AND b.booking_id = ?';
      params.push(filter.bookingId);
    }
    
    if (filter.status) {
      query += ' AND ph.status = ?';
      params.push(filter.status);
    }
    
    if (filter.paymentMethod) {
      query += ' AND ph.payment_method = ?';
      params.push(filter.paymentMethod);
    }
    
    // Add date range filters if provided
    if (filter.startDate) {
      query += ' AND ph.payment_date >= ?';
      params.push(filter.startDate instanceof Date ? filter.startDate.toISOString().split('T')[0] : filter.startDate);
    }
    
    if (filter.endDate) {
      query += ' AND ph.payment_date <= ?';
      params.push(filter.endDate instanceof Date ? filter.endDate.toISOString().split('T')[0] : filter.endDate);
    }
    
    // Add sorting
    query += ' ORDER BY ph.payment_date DESC';
    
    const [rows] = await pool.query(query, params);
    
    // Transform rows to match the expected format
    return rows.map(row => this._transformDbRowToModel(row));
  }
  
  /**
   * Find a single payment record
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Object|null>} Payment history object or null if not found
   */
  static async findOne(filter = {}) {
    const pool = await connectToDatabase();
    let query = `
      SELECT ph.*, c.first_name, c.last_name, c.phone_number, c.email, c.whatsapp_id,
             b.booking_id, b.sport, b.date, b.start_time, b.end_time
      FROM payment_history ph
      LEFT JOIN customers c ON ph.customer_id = c.id
      LEFT JOIN bookings b ON ph.booking_id = b.id
      WHERE 1=1
    `;
    const params = [];
    
    // Apply filters
    if (filter.paymentId) {
      query += ' AND ph.payment_id = ?';
      params.push(filter.paymentId);
    }
    
    if (filter.customerId) {
      query += ' AND ph.customer_id = ?';
      params.push(filter.customerId);
    }
    
    if (filter.bookingId) {
      query += ' AND b.booking_id = ?';
      params.push(filter.bookingId);
    }
    
    if (filter.status) {
      query += ' AND ph.status = ?';
      params.push(filter.status);
    }
    
    query += ' LIMIT 1';
    
    const [rows] = await pool.query(query, params);
    
    if (rows.length === 0) {
      return null;
    }
    
    return this._transformDbRowToModel(rows[0]);
  }
  
  /**
   * Find a payment record by ID
   * @param {number} id - Payment history ID
   * @returns {Promise<Object|null>} Payment history object or null if not found
   */
  static async findById(id) {
    const pool = await connectToDatabase();
    const [rows] = await pool.query(`
      SELECT ph.*, c.first_name, c.last_name, c.phone_number, c.email, c.whatsapp_id,
             b.booking_id, b.sport, b.date, b.start_time, b.end_time
      FROM payment_history ph
      LEFT JOIN customers c ON ph.customer_id = c.id
      LEFT JOIN bookings b ON ph.booking_id = b.id
      WHERE ph.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return this._transformDbRowToModel(rows[0]);
  }
  
  /**
   * Create a new payment record
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Created payment history object
   */
  static async create(paymentData) {
    const pool = await connectToDatabase();
    const {
      paymentId,
      customerId,
      bookingId,
      amount,
      currency = 'INR',
      status,
      paymentMethod,
      paymentDate = new Date(),
      metadata = {}
    } = paymentData;
    
    // Format date if it's a Date object
    const formattedDate = paymentDate instanceof Date ? 
      paymentDate.toISOString().split('T')[0] : paymentDate;
    
    // Serialize metadata to JSON string
    const metadataJson = JSON.stringify(metadata);
    
    // Insert payment record
    const [result] = await pool.query(
      `INSERT INTO payment_history (
        payment_id, customer_id, booking_id, amount, currency,
        status, payment_method, payment_date, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        customerId,
        bookingId,
        amount,
        currency,
        status,
        paymentMethod,
        formattedDate,
        metadataJson
      ]
    );
    
    // Return the created payment record
    return this.findById(result.insertId);
  }
  
  /**
   * Update a payment record
   * @param {number} id - Payment history ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated payment history object
   */
  static async update(id, updateData) {
    const pool = await connectToDatabase();
    const updates = [];
    const params = [];
    
    // Handle simple field updates
    const simpleFields = {
      paymentId: 'payment_id',
      customerId: 'customer_id',
      bookingId: 'booking_id',
      amount: 'amount',
      currency: 'currency',
      status: 'status',
      paymentMethod: 'payment_method'
    };
    
    for (const [jsField, dbField] of Object.entries(simpleFields)) {
      if (updateData[jsField] !== undefined) {
        updates.push(`${dbField} = ?`);
        params.push(updateData[jsField]);
      }
    }
    
    // Handle payment date if provided
    if (updateData.paymentDate) {
      updates.push('payment_date = ?');
      params.push(updateData.paymentDate instanceof Date ? 
        updateData.paymentDate.toISOString().split('T')[0] : updateData.paymentDate);
    }
    
    // Handle metadata if provided
    if (updateData.metadata) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(updateData.metadata));
    }
    
    if (updates.length === 0) {
      return this.findById(id);
    }
    
    params.push(id);
    await pool.query(
      `UPDATE payment_history SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    // Get the updated payment record
    return this.findById(id);
  }
  
  /**
   * Delete a payment record
   * @param {number} id - Payment history ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async delete(id) {
    const pool = await connectToDatabase();
    const [result] = await pool.query('DELETE FROM payment_history WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
  
  /**
   * Find payment records for a specific customer
   * @param {number} customerId - Customer ID
   * @returns {Promise<Array>} Array of payment history objects
   */
  static async findPaymentsForCustomer(customerId) {
    const pool = await connectToDatabase();
    const [rows] = await pool.query(`
      SELECT ph.*, c.first_name, c.last_name, c.phone_number, c.email, c.whatsapp_id,
             b.booking_id, b.sport, b.date, b.start_time, b.end_time
      FROM payment_history ph
      LEFT JOIN customers c ON ph.customer_id = c.id
      LEFT JOIN bookings b ON ph.booking_id = b.id
      WHERE ph.customer_id = ?
      ORDER BY ph.payment_date DESC
    `, [customerId]);
    
    return rows.map(row => this._transformDbRowToModel(row));
  }
  
  /**
   * Find payment records for a specific booking
   * @param {number} bookingId - Booking ID
   * @returns {Promise<Array>} Array of payment history objects
   */
  static async findPaymentsForBooking(bookingId) {
    const pool = await connectToDatabase();
    const [rows] = await pool.query(`
      SELECT ph.*, c.first_name, c.last_name, c.phone_number, c.email, c.whatsapp_id,
             b.booking_id, b.sport, b.date, b.start_time, b.end_time
      FROM payment_history ph
      LEFT JOIN customers c ON ph.customer_id = c.id
      LEFT JOIN bookings b ON ph.booking_id = b.id
      WHERE ph.booking_id = ?
      ORDER BY ph.payment_date DESC
    `, [bookingId]);
    
    return rows.map(row => this._transformDbRowToModel(row));
  }
  
  /**
   * Transform a database row to a model object
   * @param {Object} row - Database row
   * @returns {Object} Model object
   * @private
   */
  static _transformDbRowToModel(row) {
    // Parse metadata JSON string to object
    const metadata = row.metadata ? JSON.parse(row.metadata) : {};
    
    return {
      id: row.id,
      paymentId: row.payment_id,
      customerId: row.customer_id,
      bookingId: row.booking_id,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      paymentMethod: row.payment_method,
      paymentDate: row.payment_date,
      metadata,
      customer: row.first_name ? {
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        phone: row.phone_number,
        email: row.email,
        whatsappId: row.whatsapp_id
      } : null,
      booking: row.booking_id ? {
        bookingId: row.booking_id,
        sport: row.sport,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time
      } : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = PaymentHistory;