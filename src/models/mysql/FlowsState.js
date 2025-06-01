/**
 * FlowsState Model for MySQL
 * Represents the state of a WhatsApp flow conversation
 */

const connectToDatabase = require('../../utils/mysql-connection');

class FlowsState {
  /**
   * Find flow states based on filter criteria
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Array>} Array of flow state objects
   */
  static async find(filter = {}) {
    const pool = await connectToDatabase();
    let query = 'SELECT * FROM flows_state WHERE 1=1';
    const params = [];
    
    // Apply filters
    if (filter.flowToken) {
      query += ' AND flow_token = ?';
      params.push(filter.flowToken);
    }
    
    if (filter.phoneNumber) {
      query += ' AND phone_number = ?';
      params.push(filter.phoneNumber);
    }
    
    if (filter.screen) {
      query += ' AND screen = ?';
      params.push(filter.screen);
    }
    
    // Add sorting by updated_at desc
    query += ' ORDER BY updated_at DESC';
    
    const [rows] = await pool.query(query, params);
    
    // Transform rows to match the expected format from MongoDB
    return Promise.all(rows.map(row => this._transformDbRowToModel(row)));
  }
  
  /**
   * Find a single flow state
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Object|null>} Flow state object or null if not found
   */
  static async findOne(filter = {}) {
    const pool = await connectToDatabase();
    let query = 'SELECT * FROM flows_state WHERE 1=1';
    const params = [];
    
    // Apply filters
    if (filter.flowToken) {
      query += ' AND flow_token = ?';
      params.push(filter.flowToken);
    }
    
    if (filter.phoneNumber) {
      query += ' AND phone_number = ?';
      params.push(filter.phoneNumber);
    }
    
    if (filter.screen) {
      query += ' AND screen = ?';
      params.push(filter.screen);
    }
    
    // Add sorting and limit
    query += ' ORDER BY updated_at DESC LIMIT 1';
    
    const [rows] = await pool.query(query, params);
    
    if (rows.length === 0) {
      return null;
    }
    
    return this._transformDbRowToModel(rows[0]);
  }
  
  /**
   * Find a flow state by ID
   * @param {number} id - Flow state ID
   * @returns {Promise<Object|null>} Flow state object or null if not found
   */
  static async findById(id) {
    const pool = await connectToDatabase();
    const [rows] = await pool.query('SELECT * FROM flows_state WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return this._transformDbRowToModel(rows[0]);
  }
  
  /**
   * Create a new flow state
   * @param {Object} stateData - Flow state data
   * @returns {Promise<Object>} Created flow state object
   */
  static async create(stateData) {
    const pool = await connectToDatabase();
    const {
      flowToken,
      phoneNumber,
      screen,
      sport,
      date,
      duration,
      timeSlot,
      processedMessages = [],
      availableSlots = [],
      currentPage = 1,
      totalPages = 1,
      selectedSlotId,
      paymentId,
      paymentStatus,
      bookingId,
      language = 'en'
    } = stateData;
    
    // Serialize arrays and objects to JSON strings
    const processedMessagesJson = JSON.stringify(processedMessages);
    const availableSlotsJson = JSON.stringify(availableSlots);
    const sportJson = sport ? JSON.stringify(sport) : null;
    const dateJson = date ? JSON.stringify(date) : null;
    const durationJson = duration ? JSON.stringify(duration) : null;
    const timeSlotJson = timeSlot ? JSON.stringify(timeSlot) : null;
    
    // Insert flow state
    const [result] = await pool.query(
      `INSERT INTO flows_state (
        flow_token, phone_number, screen, sport, date, duration, time_slot,
        processed_messages, available_slots, current_page, total_pages,
        selected_slot_id, payment_id, payment_status, booking_id, language
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flowToken,
        phoneNumber,
        screen,
        sportJson,
        dateJson,
        durationJson,
        timeSlotJson,
        processedMessagesJson,
        availableSlotsJson,
        currentPage,
        totalPages,
        selectedSlotId,
        paymentId,
        paymentStatus,
        bookingId,
        language
      ]
    );
    
    // Return the created flow state
    return this.findById(result.insertId);
  }
  
  /**
   * Update a flow state
   * @param {number} id - Flow state ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated flow state object
   */
  static async update(id, updateData) {
    const pool = await connectToDatabase();
    const updates = [];
    const params = [];
    
    // Handle simple field updates
    const simpleFields = {
      flowToken: 'flow_token',
      phoneNumber: 'phone_number',
      screen: 'screen',
      selectedSlotId: 'selected_slot_id',
      paymentId: 'payment_id',
      paymentStatus: 'payment_status',
      bookingId: 'booking_id',
      currentPage: 'current_page',
      totalPages: 'total_pages',
      language: 'language'
    };
    
    for (const [jsField, dbField] of Object.entries(simpleFields)) {
      if (updateData[jsField] !== undefined) {
        updates.push(`${dbField} = ?`);
        params.push(updateData[jsField]);
      }
    }
    
    // Handle complex fields (objects and arrays)
    const complexFields = {
      sport: 'sport',
      date: 'date',
      duration: 'duration',
      timeSlot: 'time_slot',
      processedMessages: 'processed_messages',
      availableSlots: 'available_slots'
    };
    
    for (const [jsField, dbField] of Object.entries(complexFields)) {
      if (updateData[jsField] !== undefined) {
        updates.push(`${dbField} = ?`);
        params.push(JSON.stringify(updateData[jsField]));
      }
    }
    
    if (updates.length === 0) {
      return this.findById(id);
    }
    
    // Always update the updated_at timestamp
    updates.push('updated_at = NOW()');
    
    params.push(id);
    await pool.query(
      `UPDATE flows_state SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    // Get the updated flow state
    return this.findById(id);
  }
  
  /**
   * Delete a flow state
   * @param {number} id - Flow state ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async delete(id) {
    const pool = await connectToDatabase();
    const [result] = await pool.query('DELETE FROM flows_state WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
  
  /**
   * Delete flow states older than a certain time
   * @param {number} hours - Number of hours
   * @returns {Promise<number>} Number of deleted flow states
   */
  static async deleteOldFlowStates(hours = 24) {
    const pool = await connectToDatabase();
    const [result] = await pool.query(
      'DELETE FROM flows_state WHERE updated_at < DATE_SUB(NOW(), INTERVAL ? HOUR)',
      [hours]
    );
    return result.affectedRows;
  }
  
  /**
   * Transform a database row to a model object
   * @param {Object} row - Database row
   * @returns {Object} Model object
   * @private
   */
  static _transformDbRowToModel(row) {
    // Parse JSON strings to objects/arrays
    const processedMessages = row.processed_messages ? JSON.parse(row.processed_messages) : [];
    const availableSlots = row.available_slots ? JSON.parse(row.available_slots) : [];
    const sport = row.sport ? JSON.parse(row.sport) : null;
    const date = row.date ? JSON.parse(row.date) : null;
    const duration = row.duration ? JSON.parse(row.duration) : null;
    const timeSlot = row.time_slot ? JSON.parse(row.time_slot) : null;
    
    return {
      id: row.id,
      flowToken: row.flow_token,
      phoneNumber: row.phone_number,
      screen: row.screen,
      sport,
      date,
      duration,
      timeSlot,
      processedMessages,
      availableSlots,
      currentPage: row.current_page,
      totalPages: row.total_pages,
      selectedSlotId: row.selected_slot_id,
      paymentId: row.payment_id,
      paymentStatus: row.payment_status,
      bookingId: row.booking_id,
      language: row.language,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  /**
   * Find the most recent flow state for a phone number
   * @param {string} phoneNumber - Phone number
   * @returns {Promise<Object|null>} Flow state object or null if not found
   */
  static async findMostRecentByPhoneNumber(phoneNumber) {
    return this.findOne({ phoneNumber });
  }
}

module.exports = FlowsState;