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
    
    // Transform rows to match the expected format
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
   * @returns {Promise<Object>} Created flow state
   */
  static async create(stateData) {
    const pool = await connectToDatabase();
    
    // Extract values from stateData
    const {
      flowToken,
      phoneNumber = null,
      screen,
      sport = null,
      date = null,
      duration = null,
      timeSlot = null,
      name = null,
      email = null,
      totalAmount = null,
      originalAmount = null,
      discountInfo = null,
      isDateEnabled = false,
      isDurationEnabled = false,
      isTimeSlotsEnabled = false,
      isFooterEnabled = false,
      minDate = null,
      maxDate = null,
      processedMessages = [],
      availableSlots = [],
      selectedSlotId = null,
      paymentId = null,
      paymentStatus = null,
      bookingId = null,
      language = 'en'
    } = stateData;
    
    // Convert arrays and objects to JSON strings
    const processedMessagesJson = JSON.stringify(processedMessages);
    const availableSlotsJson = JSON.stringify(availableSlots);
    const sportJson = sport ? JSON.stringify(sport) : null;
    const dateJson = date ? JSON.stringify(date) : null;
    // Handle duration as a string, not JSON
    const durationJson = duration;
    // Handle time_slot as a string, not JSON, and ensure it's never null
    const timeSlotJson = timeSlot === null ? "" : timeSlot;
    
    // Insert flow state
    const [result] = await pool.query(
      `INSERT INTO flows_state (
        flow_token, phone_number, screen, sport, date, duration, time_slot,
        name, email, total_amount, original_amount, discount_info,
        is_date_enabled, is_duration_enabled, is_time_slots_enabled, is_footer_enabled,
        min_date, max_date,
        processed_messages, available_slots, selected_slot_id, 
        payment_id, payment_status, booking_id, language
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flowToken,
        phoneNumber,
        screen,
        sportJson,
        dateJson,
        durationJson,
        timeSlotJson,
        name,
        email,
        totalAmount,
        originalAmount,
        discountInfo,
        isDateEnabled ? 1 : 0,
        isDurationEnabled ? 1 : 0,
        isTimeSlotsEnabled ? 1 : 0,
        isFooterEnabled ? 1 : 0,
        minDate,
        maxDate,
        processedMessagesJson,
        availableSlotsJson,
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
   * @returns {Promise<Object>} Updated flow state
   */
  static async update(id, updateData) {
    const pool = await connectToDatabase();
    
    // Build update query
    const updates = [];
    const params = [];
    
    // Handle each field that can be updated
    if (updateData.screen !== undefined) {
      updates.push('screen = ?');
      params.push(updateData.screen);
    }
    
    if (updateData.phoneNumber !== undefined) {
      updates.push('phone_number = ?');
      params.push(updateData.phoneNumber);
    }
    
    if (updateData.sport !== undefined) {
      updates.push('sport = ?');
      params.push(updateData.sport ? JSON.stringify(updateData.sport) : null);
    }
    
    if (updateData.date !== undefined) {
      updates.push('date = ?');
      params.push(updateData.date ? JSON.stringify(updateData.date) : null);
    }
    
    if (updateData.duration !== undefined) {
      updates.push('duration = ?');
      // Handle duration as a string, not JSON
      params.push(updateData.duration);
    }
    
    if (updateData.timeSlot !== undefined) {
      updates.push('time_slot = ?');
      // Handle time_slot as a string, not JSON, and ensure it's never null
      params.push(updateData.timeSlot === null ? "" : updateData.timeSlot);
    }
    
    if (updateData.name !== undefined) {
      updates.push('name = ?');
      params.push(updateData.name);
    }
    
    if (updateData.email !== undefined) {
      updates.push('email = ?');
      params.push(updateData.email);
    }
    
    if (updateData.totalAmount !== undefined) {
      updates.push('total_amount = ?');
      params.push(updateData.totalAmount);
    }
    
    if (updateData.originalAmount !== undefined) {
      updates.push('original_amount = ?');
      params.push(updateData.originalAmount);
    }
    
    if (updateData.discountInfo !== undefined) {
      updates.push('discount_info = ?');
      params.push(updateData.discountInfo);
    }
    
    if (updateData.isDateEnabled !== undefined) {
      updates.push('is_date_enabled = ?');
      params.push(updateData.isDateEnabled ? 1 : 0);
    }
    
    if (updateData.isDurationEnabled !== undefined) {
      updates.push('is_duration_enabled = ?');
      params.push(updateData.isDurationEnabled ? 1 : 0);
    }
    
    if (updateData.isTimeSlotsEnabled !== undefined) {
      updates.push('is_time_slots_enabled = ?');
      params.push(updateData.isTimeSlotsEnabled ? 1 : 0);
    }
    
    if (updateData.isFooterEnabled !== undefined) {
      updates.push('is_footer_enabled = ?');
      params.push(updateData.isFooterEnabled ? 1 : 0);
    }
    
    if (updateData.minDate !== undefined) {
      updates.push('min_date = ?');
      params.push(updateData.minDate);
    }
    
    if (updateData.maxDate !== undefined) {
      updates.push('max_date = ?');
      params.push(updateData.maxDate);
    }
    
    if (updateData.processedMessages !== undefined) {
      updates.push('processed_messages = ?');
      params.push(JSON.stringify(updateData.processedMessages));
    }
    
    if (updateData.availableSlots !== undefined) {
      updates.push('available_slots = ?');
      params.push(JSON.stringify(updateData.availableSlots));
    }
    
    if (updateData.selectedSlotId !== undefined) {
      updates.push('selected_slot_id = ?');
      params.push(updateData.selectedSlotId);
    }
    
    if (updateData.paymentId !== undefined) {
      updates.push('payment_id = ?');
      params.push(updateData.paymentId);
    }
    
    if (updateData.paymentStatus !== undefined) {
      updates.push('payment_status = ?');
      params.push(updateData.paymentStatus);
    }
    
    if (updateData.bookingId !== undefined) {
      updates.push('booking_id = ?');
      params.push(updateData.bookingId);
    }
    
    if (updateData.language !== undefined) {
      updates.push('language = ?');
      params.push(updateData.language);
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
   * Ensure all required columns exist in the flows_state table
   * @private
   */
  static async _ensureColumnsExist() {
    const pool = await connectToDatabase();
    
    // List of columns that might need to be added
    const columnsToCheck = [
      { name: 'language', type: 'VARCHAR(10) DEFAULT \'en\'', after: 'booking_id' },
      { name: 'name', type: 'VARCHAR(100)', after: 'time_slot' },
      { name: 'email', type: 'VARCHAR(100)', after: 'name' },
      { name: 'total_amount', type: 'VARCHAR(20)', after: 'email' },
      { name: 'original_amount', type: 'VARCHAR(20)', after: 'total_amount' },
      { name: 'discount_info', type: 'VARCHAR(255)', after: 'original_amount' },
      { name: 'is_date_enabled', type: 'BOOLEAN DEFAULT FALSE', after: 'discount_info' },
      { name: 'is_duration_enabled', type: 'BOOLEAN DEFAULT FALSE', after: 'is_date_enabled' },
      { name: 'is_time_slots_enabled', type: 'BOOLEAN DEFAULT FALSE', after: 'is_duration_enabled' },
      { name: 'is_footer_enabled', type: 'BOOLEAN DEFAULT FALSE', after: 'is_time_slots_enabled' },
      { name: 'min_date', type: 'VARCHAR(20)', after: 'is_footer_enabled' },
      { name: 'max_date', type: 'VARCHAR(20)', after: 'min_date' }
    ];
    
    // Check each column and add if missing
    for (const column of columnsToCheck) {
      try {
        const [columns] = await pool.query(`SHOW COLUMNS FROM flows_state LIKE '${column.name}'`);
        
        if (columns.length === 0) {
          console.log(`🔄 Adding ${column.name} column to flows_state table...`);
          await pool.query(`ALTER TABLE flows_state ADD COLUMN ${column.name} ${column.type} AFTER ${column.after}`);
          console.log(`✅ Successfully added ${column.name} column to flows_state table`);
        }
      } catch (error) {
        console.error(`❌ Failed to check/add ${column.name} column:`, error);
        // Continue with other columns even if one fails
      }
    }
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
    // Handle duration as a string, not JSON
    const duration = row.duration || null;
    // Handle time_slot as a string, not JSON, and ensure it's never null
    const timeSlot = row.time_slot || "";
    
    return {
      id: row.id,
      flowToken: row.flow_token,
      phoneNumber: row.phone_number,
      screen: row.screen,
      sport,
      date,
      duration,
      timeSlot,
      name: row.name || null,
      email: row.email || null,
      totalAmount: row.total_amount || null,
      originalAmount: row.original_amount || null,
      discountInfo: row.discount_info || null,
      isDateEnabled: row.is_date_enabled ? Boolean(row.is_date_enabled) : false,
      isDurationEnabled: row.is_duration_enabled ? Boolean(row.is_duration_enabled) : false,
      isTimeSlotsEnabled: row.is_time_slots_enabled ? Boolean(row.is_time_slots_enabled) : false,
      isFooterEnabled: row.is_footer_enabled ? Boolean(row.is_footer_enabled) : false,
      minDate: row.min_date || null,
      maxDate: row.max_date || null,
      processedMessages,
      availableSlots,
      selectedSlotId: row.selected_slot_id,
      paymentId: row.payment_id,
      paymentStatus: row.payment_status,
      bookingId: row.booking_id,
      language: row.language || 'en',
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