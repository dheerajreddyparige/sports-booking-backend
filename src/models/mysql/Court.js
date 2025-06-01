/**
 * Court Model for MySQL
 * Represents a sports court in the facility
 */

const connectToDatabase = require('../../utils/mysql-connection');

class Court {
  /**
   * Find all courts
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Array>} Array of court objects
   */
  static async find(filter = {}) {
    const pool = await connectToDatabase();
    let query = 'SELECT * FROM courts WHERE 1=1';
    const params = [];
    
    // Apply filters
    if (filter.sport) {
      query += ' AND sport = ?';
      params.push(filter.sport);
    }
    
    if (filter.isActive !== undefined) {
      query += ' AND is_active = ?';
      params.push(filter.isActive);
    }
    
    if (filter.courtId) {
      query += ' AND court_id = ?';
      params.push(filter.courtId);
    }
    
    const [rows] = await pool.query(query, params);
    
    // Transform rows to match the expected format from MongoDB
    return rows.map(row => ({
      id: row.id,
      sport: row.sport,
      courtId: row.court_id,
      name: row.name,
      isActive: Boolean(row.is_active)
    }));
  }
  
  /**
   * Find a single court
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Object|null>} Court object or null if not found
   */
  static async findOne(filter = {}) {
    const pool = await connectToDatabase();
    let query = 'SELECT * FROM courts WHERE 1=1';
    const params = [];
    
    // Apply filters
    if (filter.sport) {
      query += ' AND sport = ?';
      params.push(filter.sport);
    }
    
    if (filter.courtId) {
      query += ' AND court_id = ?';
      params.push(filter.courtId);
    }
    
    if (filter.isActive !== undefined) {
      query += ' AND is_active = ?';
      params.push(filter.isActive);
    }
    
    query += ' LIMIT 1';
    
    const [rows] = await pool.query(query, params);
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    return {
      id: row.id,
      sport: row.sport,
      courtId: row.court_id,
      name: row.name,
      isActive: Boolean(row.is_active)
    };
  }
  
  /**
   * Find a single court by ID
   * @param {number} id - Court ID
   * @returns {Promise<Object|null>} Court object or null if not found
   */
  static async findById(id) {
    const pool = await connectToDatabase();
    const [rows] = await pool.query('SELECT * FROM courts WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    return {
      id: row.id,
      sport: row.sport,
      courtId: row.court_id,
      name: row.name,
      isActive: Boolean(row.is_active)
    };
  }
  
  /**
   * Create a new court
   * @param {Object} courtData - Court data
   * @returns {Promise<Object>} Created court object
   */
  static async create(courtData) {
    const pool = await connectToDatabase();
    const { sport, courtId, name, isActive = true } = courtData;
    
    const [result] = await pool.query(
      'INSERT INTO courts (sport, court_id, name, is_active) VALUES (?, ?, ?, ?)',
      [sport, courtId, name, isActive]
    );
    
    return {
      id: result.insertId,
      sport,
      courtId,
      name,
      isActive
    };
  }
  
  /**
   * Update a court
   * @param {number} id - Court ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated court object
   */
  static async update(id, updateData) {
    const pool = await connectToDatabase();
    const updates = [];
    const params = [];
    
    if (updateData.sport !== undefined) {
      updates.push('sport = ?');
      params.push(updateData.sport);
    }
    
    if (updateData.courtId !== undefined) {
      updates.push('court_id = ?');
      params.push(updateData.courtId);
    }
    
    if (updateData.name !== undefined) {
      updates.push('name = ?');
      params.push(updateData.name);
    }
    
    if (updateData.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(updateData.isActive);
    }
    
    if (updates.length === 0) {
      return this.findById(id);
    }
    
    params.push(id);
    await pool.query(
      `UPDATE courts SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    return this.findById(id);
  }
  
  /**
   * Delete a court
   * @param {number} id - Court ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async delete(id) {
    const pool = await connectToDatabase();
    const [result] = await pool.query('DELETE FROM courts WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
  /**
   * Find all active courts for a specific sport
   * @param {string} sport - Sport name
   * @returns {Promise<Array>} Array of court objects
   */
  static async findActiveCourtsForSport(sport) {
    return this.find({ sport, isActive: true });
  }
  
  /**
   * Find all active courts grouped by sport
   * @returns {Promise<Object>} Object with sport names as keys and arrays of courts as values
   */
  static async findActiveCourtsByGroup() {
    const courts = await this.find({ isActive: true });
    
    // Group courts by sport
    const groupedCourts = {};
    for (const court of courts) {
      if (!groupedCourts[court.sport]) {
        groupedCourts[court.sport] = [];
      }
      groupedCourts[court.sport].push(court);
    }
    
    return groupedCourts;
  }
}

module.exports = Court;