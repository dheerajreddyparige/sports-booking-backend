/**
 * SportConfig Model for MySQL
 * Represents configuration settings for each sport
 */

const connectToDatabase = require('../../utils/mysql-connection');

class SportConfig {
  /**
   * Find sport configurations
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Array>} Array of sport config objects
   */
  static async find(filter = {}) {
    const pool = await connectToDatabase();
    let query = 'SELECT * FROM sport_configs WHERE 1=1';
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
    
    const [rows] = await pool.query(query, params);
    
    // Transform rows to match the expected format from MongoDB
    return rows.map(row => this._transformDbRowToModel(row));
  }
  
  /**
   * Find a single sport configuration
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Object|null>} Sport config object or null if not found
   */
  static async findOne(filter = {}) {
    const pool = await connectToDatabase();
    let query = 'SELECT sc.*, mh.day, mh.start_time as mh_start_time, mh.end_time as mh_end_time FROM sport_configs sc';
    let params = [];
    
    // Apply filters
    let whereClause = [];
    
    if (filter.sport) {
      whereClause.push('sc.sport = ?');
      params.push(filter.sport);
    }
    
    if (filter.isActive !== undefined) {
      whereClause.push('sc.is_active = ?');
      params.push(filter.isActive);
    }
    
    if (whereClause.length > 0) {
      query += ' WHERE ' + whereClause.join(' AND ');
    }
    
    // Left join with maintenance hours
    query += ' LEFT JOIN maintenance_hours mh ON sc.id = mh.sport_config_id';
    
    const [rows] = await pool.query(query, params);
    
    if (rows.length === 0) {
      return null;
    }
    
    // Group maintenance hours with the sport config
    const sportConfig = this._transformDbRowToModel(rows[0]);
    
    // Add maintenance hours if they exist
    if (rows[0].day) {
      sportConfig.maintenanceHours = rows.map(row => ({
        day: row.day,
        startTime: row.mh_start_time ? this._formatTimeToString(row.mh_start_time) : null,
        endTime: row.mh_end_time ? this._formatTimeToString(row.mh_end_time) : null
      }));
    } else {
      sportConfig.maintenanceHours = [];
    }
    
    return sportConfig;
  }
  
  /**
   * Create a new sport configuration
   * @param {Object} configData - Sport configuration data
   * @returns {Promise<Object>} Created sport config object
   */
  static async create(configData) {
    const pool = await connectToDatabase();
    const {
      sport,
      baseRate,
      pricingRates = {},
      timePeriods = {},
      discounts = {},
      availableTimes = {},
      maxBookingDays = 7,
      maintenanceHours = [],
      isActive = true,
      description,
      imageUrl
    } = configData;
    
    // Extract pricing rates
    const weekdayMorningRate = pricingRates.weekday?.morning || baseRate;
    const weekdayEveningRate = pricingRates.weekday?.evening || Math.round(baseRate * 1.25);
    const weekendMorningRate = pricingRates.weekend?.morning || Math.round(baseRate * 1.25);
    const weekendEveningRate = pricingRates.weekend?.evening || Math.round(baseRate * 1.5);
    
    // Extract time periods
    const morningStartTime = timePeriods.morning?.startTime || '05:00';
    const morningEndTime = timePeriods.morning?.endTime || '17:00';
    const eveningStartTime = timePeriods.evening?.startTime || '17:00';
    const eveningEndTime = timePeriods.evening?.endTime || '23:00';
    
    // Extract discounts
    const twoHourDiscount = discounts.twoHour || 5;
    const threeHourDiscount = discounts.threeHour || 10;
    const fourHourDiscount = discounts.fourHour || 15;
    
    // Extract available times
    const openTime = availableTimes.openTime || '05:00';
    const closeTime = availableTimes.closeTime || '23:00';
    
    // Insert sport config
    const [result] = await pool.query(
      `INSERT INTO sport_configs (
        sport, base_rate, 
        weekday_morning_rate, weekday_evening_rate, 
        weekend_morning_rate, weekend_evening_rate,
        morning_start_time, morning_end_time,
        evening_start_time, evening_end_time,
        two_hour_discount, three_hour_discount, four_hour_discount,
        open_time, close_time,
        max_booking_days, is_active, description, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sport, baseRate,
        weekdayMorningRate, weekdayEveningRate,
        weekendMorningRate, weekendEveningRate,
        morningStartTime, morningEndTime,
        eveningStartTime, eveningEndTime,
        twoHourDiscount, threeHourDiscount, fourHourDiscount,
        openTime, closeTime,
        maxBookingDays, isActive, description, imageUrl
      ]
    );
    
    const sportConfigId = result.insertId;
    
    // Insert maintenance hours if provided
    if (maintenanceHours && maintenanceHours.length > 0) {
      for (const hour of maintenanceHours) {
        await pool.query(
          'INSERT INTO maintenance_hours (sport_config_id, day, start_time, end_time) VALUES (?, ?, ?, ?)',
          [sportConfigId, hour.day, hour.startTime, hour.endTime]
        );
      }
    }
    
    // Return the created sport config
    return this.findOne({ sport });
  }
  
  /**
   * Update a sport configuration
   * @param {number} id - Sport config ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated sport config object
   */
  static async update(id, updateData) {
    const pool = await connectToDatabase();
    const updates = [];
    const params = [];
    
    // Handle simple field updates
    const simpleFields = {
      sport: 'sport',
      baseRate: 'base_rate',
      maxBookingDays: 'max_booking_days',
      isActive: 'is_active',
      description: 'description',
      imageUrl: 'image_url'
    };
    
    for (const [jsField, dbField] of Object.entries(simpleFields)) {
      if (updateData[jsField] !== undefined) {
        updates.push(`${dbField} = ?`);
        params.push(updateData[jsField]);
      }
    }
    
    // Handle pricing rates
    if (updateData.pricingRates) {
      if (updateData.pricingRates.weekday) {
        if (updateData.pricingRates.weekday.morning !== undefined) {
          updates.push('weekday_morning_rate = ?');
          params.push(updateData.pricingRates.weekday.morning);
        }
        if (updateData.pricingRates.weekday.evening !== undefined) {
          updates.push('weekday_evening_rate = ?');
          params.push(updateData.pricingRates.weekday.evening);
        }
      }
      if (updateData.pricingRates.weekend) {
        if (updateData.pricingRates.weekend.morning !== undefined) {
          updates.push('weekend_morning_rate = ?');
          params.push(updateData.pricingRates.weekend.morning);
        }
        if (updateData.pricingRates.weekend.evening !== undefined) {
          updates.push('weekend_evening_rate = ?');
          params.push(updateData.pricingRates.weekend.evening);
        }
      }
    }
    
    // Handle time periods
    if (updateData.timePeriods) {
      if (updateData.timePeriods.morning) {
        if (updateData.timePeriods.morning.startTime !== undefined) {
          updates.push('morning_start_time = ?');
          params.push(updateData.timePeriods.morning.startTime);
        }
        if (updateData.timePeriods.morning.endTime !== undefined) {
          updates.push('morning_end_time = ?');
          params.push(updateData.timePeriods.morning.endTime);
        }
      }
      if (updateData.timePeriods.evening) {
        if (updateData.timePeriods.evening.startTime !== undefined) {
          updates.push('evening_start_time = ?');
          params.push(updateData.timePeriods.evening.startTime);
        }
        if (updateData.timePeriods.evening.endTime !== undefined) {
          updates.push('evening_end_time = ?');
          params.push(updateData.timePeriods.evening.endTime);
        }
      }
    }
    
    // Handle discounts
    if (updateData.discounts) {
      if (updateData.discounts.twoHour !== undefined) {
        updates.push('two_hour_discount = ?');
        params.push(updateData.discounts.twoHour);
      }
      if (updateData.discounts.threeHour !== undefined) {
        updates.push('three_hour_discount = ?');
        params.push(updateData.discounts.threeHour);
      }
      if (updateData.discounts.fourHour !== undefined) {
        updates.push('four_hour_discount = ?');
        params.push(updateData.discounts.fourHour);
      }
    }
    
    // Handle available times
    if (updateData.availableTimes) {
      if (updateData.availableTimes.openTime !== undefined) {
        updates.push('open_time = ?');
        params.push(updateData.availableTimes.openTime);
      }
      if (updateData.availableTimes.closeTime !== undefined) {
        updates.push('close_time = ?');
        params.push(updateData.availableTimes.closeTime);
      }
    }
    
    if (updates.length === 0) {
      return this.findById(id);
    }
    
    params.push(id);
    await pool.query(
      `UPDATE sport_configs SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    // Handle maintenance hours if provided
    if (updateData.maintenanceHours) {
      // Delete existing maintenance hours
      await pool.query('DELETE FROM maintenance_hours WHERE sport_config_id = ?', [id]);
      
      // Insert new maintenance hours
      for (const hour of updateData.maintenanceHours) {
        await pool.query(
          'INSERT INTO maintenance_hours (sport_config_id, day, start_time, end_time) VALUES (?, ?, ?, ?)',
          [id, hour.day, hour.startTime, hour.endTime]
        );
      }
    }
    
    // Get the updated sport config
    const [rows] = await pool.query('SELECT * FROM sport_configs WHERE id = ?', [id]);
    if (rows.length === 0) {
      return null;
    }
    
    return this.findOne({ sport: rows[0].sport });
  }
  
  /**
   * Find a sport configuration by ID
   * @param {number} id - Sport config ID
   * @returns {Promise<Object|null>} Sport config object or null if not found
   */
  static async findById(id) {
    const pool = await connectToDatabase();
    const [rows] = await pool.query('SELECT * FROM sport_configs WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    // Get maintenance hours
    const [maintenanceHours] = await pool.query(
      'SELECT * FROM maintenance_hours WHERE sport_config_id = ?',
      [id]
    );
    
    const sportConfig = this._transformDbRowToModel(rows[0]);
    sportConfig.maintenanceHours = maintenanceHours.map(hour => ({
      day: hour.day,
      startTime: this._formatTimeToString(hour.start_time),
      endTime: this._formatTimeToString(hour.end_time)
    }));
    
    return sportConfig;
  }
  
  /**
   * Delete a sport configuration
   * @param {number} id - Sport config ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async delete(id) {
    const pool = await connectToDatabase();
    
    // Delete maintenance hours first (due to foreign key constraint)
    await pool.query('DELETE FROM maintenance_hours WHERE sport_config_id = ?', [id]);
    
    // Delete sport config
    const [result] = await pool.query('DELETE FROM sport_configs WHERE id = ?', [id]);
    return result.affectedRows > 0;
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
      sport: row.sport,
      baseRate: row.base_rate,
      pricingRates: {
        weekday: {
          morning: row.weekday_morning_rate,
          evening: row.weekday_evening_rate
        },
        weekend: {
          morning: row.weekend_morning_rate,
          evening: row.weekend_evening_rate
        }
      },
      timePeriods: {
        morning: {
          startTime: this._formatTimeToString(row.morning_start_time),
          endTime: this._formatTimeToString(row.morning_end_time)
        },
        evening: {
          startTime: this._formatTimeToString(row.evening_start_time),
          endTime: this._formatTimeToString(row.evening_end_time)
        }
      },
      discounts: {
        twoHour: row.two_hour_discount,
        threeHour: row.three_hour_discount,
        fourHour: row.four_hour_discount
      },
      availableTimes: {
        openTime: this._formatTimeToString(row.open_time),
        closeTime: this._formatTimeToString(row.close_time)
      },
      maxBookingDays: row.max_booking_days,
      isActive: Boolean(row.is_active),
      description: row.description,
      imageUrl: row.image_url,
      updatedAt: row.updated_at
    };
  }
  
  /**
   * Format a time object to a string (HH:MM)
   * @param {Object} time - Time object from MySQL
   * @returns {string} Formatted time string
   * @private
   */
  static _formatTimeToString(time) {
    if (!time) return null;
    
    // Handle if time is already a string
    if (typeof time === 'string') {
      return time;
    }
    
    // Handle MySQL TIME object
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

module.exports = SportConfig;