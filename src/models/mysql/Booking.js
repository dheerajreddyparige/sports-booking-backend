/**
 * Booking Model for MySQL
 * Represents a booking in the sports booking system
 */

const connectToDatabase = require('../../utils/mysql-connection');

class Booking {
  /**
   * Find bookings based on filter criteria
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Array>} Array of booking objects
   */
  static async find(filter = {}) {
    const pool = await connectToDatabase();
    let query = `
      SELECT b.*, c.first_name, c.last_name, c.phone_number, c.email, c.whatsapp_id,
             ct.name as court_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN courts ct ON b.court_id = ct.id
      WHERE 1=1
    `;
    const params = [];
    
    // Apply filters
    if (filter.bookingId) {
      query += ' AND b.booking_id = ?';
      params.push(filter.bookingId);
    }
    
    if (filter.customerId) {
      query += ' AND c.customer_id = ?';
      params.push(filter.customerId);
    }
    
    if (filter.phoneNumber) {
      query += ' AND c.phone_number = ?';
      params.push(filter.phoneNumber);
    }
    
    if (filter.whatsappId) {
      query += ' AND c.whatsapp_id = ?';
      params.push(filter.whatsappId);
    }
    
    if (filter.sport) {
      query += ' AND b.sport = ?';
      params.push(filter.sport);
    }
    
    if (filter.date) {
      query += ' AND b.date = ?';
      params.push(filter.date instanceof Date ? filter.date.toISOString().split('T')[0] : filter.date);
    }
    
    if (filter.status) {
      query += ' AND b.status = ?';
      params.push(filter.status);
    }
    
    if (filter.flowToken) {
      query += ' AND b.flow_token = ?';
      params.push(filter.flowToken);
    }
    
    if (filter.sessionToken) {
      query += ' AND b.session_token = ?';
      params.push(filter.sessionToken);
    }
    
    // Add date range filters if provided
    if (filter.startDate) {
      query += ' AND b.date >= ?';
      params.push(filter.startDate instanceof Date ? filter.startDate.toISOString().split('T')[0] : filter.startDate);
    }
    
    if (filter.endDate) {
      query += ' AND b.date <= ?';
      params.push(filter.endDate instanceof Date ? filter.endDate.toISOString().split('T')[0] : filter.endDate);
    }
    
    // Add sorting
    query += ' ORDER BY b.date DESC, b.start_time ASC';
    
    const [rows] = await pool.query(query, params);
    
    // Transform rows to match the expected format from MongoDB
    return rows.map(row => this._transformDbRowToModel(row));
  }
  
  /**
   * Find a single booking
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Object|null>} Booking object or null if not found
   */
  static async findOne(filter = {}) {
    const pool = await connectToDatabase();
    let query = `
      SELECT b.*, c.first_name, c.last_name, c.phone_number, c.email, c.whatsapp_id,
             ct.name as court_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN courts ct ON b.court_id = ct.id
      WHERE 1=1
    `;
    const params = [];
    
    // Apply filters
    if (filter.bookingId) {
      query += ' AND b.booking_id = ?';
      params.push(filter.bookingId);
    }
    
    if (filter.customerId) {
      query += ' AND c.customer_id = ?';
      params.push(filter.customerId);
    }
    
    if (filter.phoneNumber) {
      query += ' AND c.phone_number = ?';
      params.push(filter.phoneNumber);
    }
    
    if (filter.whatsappId) {
      query += ' AND c.whatsapp_id = ?';
      params.push(filter.whatsappId);
    }
    
    if (filter.sport) {
      query += ' AND b.sport = ?';
      params.push(filter.sport);
    }
    
    if (filter.date) {
      query += ' AND b.date = ?';
      params.push(filter.date instanceof Date ? filter.date.toISOString().split('T')[0] : filter.date);
    }
    
    if (filter.status) {
      query += ' AND b.status = ?';
      params.push(filter.status);
    }
    
    if (filter.flowToken) {
      query += ' AND b.flow_token = ?';
      params.push(filter.flowToken);
    }
    
    if (filter.sessionToken) {
      query += ' AND b.session_token = ?';
      params.push(filter.sessionToken);
    }
    
    query += ' LIMIT 1';
    
    const [rows] = await pool.query(query, params);
    
    if (rows.length === 0) {
      return null;
    }
    
    return this._transformDbRowToModel(rows[0]);
  }
  
  /**
   * Find a booking by ID
   * @param {number} id - Booking ID
   * @returns {Promise<Object|null>} Booking object or null if not found
   */
  static async findById(id) {
    const pool = await connectToDatabase();
    const [rows] = await pool.query(`
      SELECT b.*, c.first_name, c.last_name, c.phone_number, c.email, c.whatsapp_id,
             ct.name as court_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN courts ct ON b.court_id = ct.id
      WHERE b.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return this._transformDbRowToModel(rows[0]);
  }
  
  /**
   * Create a new booking
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>} Created booking object
   */
  static async create(bookingData) {
    const pool = await connectToDatabase();
    const {
      bookingId,
      sport,
      courtId,
      date,
      startTime,
      endTime,
      duration,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      status = 'pending',
      amount,
      paymentId,
      paymentStatus = 'pending',
      flowToken,
      sessionToken
    } = bookingData;
    
    // Format date if it's a Date object
    const formattedDate = date instanceof Date ? date.toISOString().split('T')[0] : date;
    
    // Insert booking
    const [result] = await pool.query(
      `INSERT INTO bookings (
        booking_id, sport, court_id, date, start_time, end_time, duration,
        customer_id, customer_name, customer_phone, customer_email,
        status, amount, payment_id, payment_status, flow_token, session_token
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingId || `BK${Date.now()}`,
        sport,
        courtId,
        formattedDate,
        startTime,
        endTime,
        duration,
        customerId,
        customerName,
        customerPhone,
        customerEmail,
        status,
        amount,
        paymentId,
        paymentStatus,
        flowToken,
        sessionToken
      ]
    );
    
    // Return the created booking
    return this.findById(result.insertId);
  }
  
  /**
   * Update a booking
   * @param {number} id - Booking ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated booking object
   */
  static async update(id, updateData) {
    const pool = await connectToDatabase();
    const updates = [];
    const params = [];
    
    // Handle simple field updates
    const simpleFields = {
      bookingId: 'booking_id',
      sport: 'sport',
      courtId: 'court_id',
      date: 'date',
      startTime: 'start_time',
      endTime: 'end_time',
      duration: 'duration',
      customerId: 'customer_id',
      customerName: 'customer_name',
      customerPhone: 'customer_phone',
      customerEmail: 'customer_email',
      status: 'status',
      amount: 'amount',
      paymentId: 'payment_id',
      paymentStatus: 'payment_status',
      flowToken: 'flow_token',
      sessionToken: 'session_token'
    };
    
    for (const [jsField, dbField] of Object.entries(simpleFields)) {
      if (updateData[jsField] !== undefined) {
        // Format date if it's a Date object
        if (jsField === 'date' && updateData[jsField] instanceof Date) {
          updates.push(`${dbField} = ?`);
          params.push(updateData[jsField].toISOString().split('T')[0]);
        } else {
          updates.push(`${dbField} = ?`);
          params.push(updateData[jsField]);
        }
      }
    }
    
    if (updates.length === 0) {
      return this.findById(id);
    }
    
    params.push(id);
    await pool.query(
      `UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    // Get the updated booking
    return this.findById(id);
  }
  
  /**
   * Delete a booking
   * @param {number} id - Booking ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async delete(id) {
    const pool = await connectToDatabase();
    const [result] = await pool.query('DELETE FROM bookings WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
  
  /**
   * Find bookings for a specific date and court
   * @param {string} sport - Sport name
   * @param {string} date - Date string (YYYY-MM-DD)
   * @param {number} courtId - Court ID
   * @returns {Promise<Array>} Array of booking objects
   */
  static async findBookingsForDateAndCourt(sport, date, courtId) {
    const pool = await connectToDatabase();
    const [rows] = await pool.query(`
      SELECT b.*, c.first_name, c.last_name, c.phone_number, c.email, c.whatsapp_id,
             ct.name as court_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN courts ct ON b.court_id = ct.id
      WHERE b.sport = ? AND b.date = ? AND b.court_id = ?
      ORDER BY b.start_time ASC
    `, [sport, date, courtId]);
    
    return rows.map(row => this._transformDbRowToModel(row));
  }
  
  /**
   * Find bookings for a specific date range
   * @param {string} startDate - Start date string (YYYY-MM-DD)
   * @param {string} endDate - End date string (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of booking objects
   */
  static async findBookingsForDateRange(startDate, endDate) {
    const pool = await connectToDatabase();
    const [rows] = await pool.query(`
      SELECT b.*, c.first_name, c.last_name, c.phone_number, c.email, c.whatsapp_id,
             ct.name as court_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN courts ct ON b.court_id = ct.id
      WHERE b.date BETWEEN ? AND ?
      ORDER BY b.date ASC, b.start_time ASC
    `, [startDate, endDate]);
    
    return rows.map(row => this._transformDbRowToModel(row));
  }
  
  /**
   * Find bookings for a specific customer
   * @param {number} customerId - Customer ID
   * @returns {Promise<Array>} Array of booking objects
   */
  static async findBookingsForCustomer(customerId) {
    const pool = await connectToDatabase();
    const [rows] = await pool.query(`
      SELECT b.*, c.first_name, c.last_name, c.phone_number, c.email, c.whatsapp_id,
             ct.name as court_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN courts ct ON b.court_id = ct.id
      WHERE b.customer_id = ?
      ORDER BY b.date DESC, b.start_time ASC
    `, [customerId]);
    
    return rows.map(row => this._transformDbRowToModel(row));
  }
  
  /**
   * Transform a database row to a model object
   * @param {Object} row - Database row
   * @returns {Object} Model object
   * @private
   */
  static _transformDbRowToModel(row) {
    return {
      id: row.id,
      bookingId: row.booking_id,
      sport: row.sport,
      courtId: row.court_id,
      courtName: row.court_name,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      customer: {
        id: row.customer_id,
        name: row.customer_name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        phone: row.customer_phone || row.phone_number,
        email: row.customer_email || row.email,
        whatsappId: row.whatsapp_id
      },
      status: row.status,
      amount: row.amount,
      payment: {
        id: row.payment_id,
        status: row.payment_status
      },
      flowToken: row.flow_token,
      sessionToken: row.session_token,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = Booking;