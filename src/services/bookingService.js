/**
 * Booking Service
 * Service for handling booking operations
 */

const db = require('../models/mysql/db');

/**
 * Create a temporary booking
 * @param {Object} bookingData - Booking data
 * @returns {Promise<Object>} - Created booking
 */
async function createTemporaryBooking(bookingData) {
  try {
    // Log booking data for debugging
    console.log('Creating temporary booking with data:', JSON.stringify(bookingData));
    
    // Extract booking data with fallbacks to prevent undefined values
    const {
      sport = null,
      date = null,
      time_slot = null,
      duration = null,
      total_amount = 0,
      name = null,
      email = null,
      phone = null,
      payment_method = 'razorpay',
      booking_id = 'BK' + Date.now(),
      status = 'pending',
      payment_status = 'pending',
      flow_token = null
    } = bookingData || {};
    
    // Check for required fields
    if (!phone) {
      throw new Error('Customer phone number is required');
    }
    
    // Insert into bookings table (plural)
    const query = `
      INSERT INTO bookings (
        sport, 
        date, 
        start_time, 
        duration, 
        amount, 
        customer_name, 
        customer_email, 
        customer_phone, 
        payment_method, 
        status, 
        payment_status,
        flow_token,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    // Ensure all values are non-undefined (convert undefined to null)
    const values = [
      sport,
      date,
      time_slot, // Using time_slot as start_time
      duration,
      total_amount,
      name,
      email,
      phone,
      payment_method,
      status,
      payment_status,
      flow_token
    ].map(val => val === undefined ? null : val); // Convert undefined values to null
    
    console.log('Executing SQL query with values:', values);
    
    const [result] = await db.execute(query, values);
    console.log('Booking created successfully, ID:', result.insertId);
    
    // Get inserted booking by ID
    return await getBookingById(result.insertId);
  } catch (error) {
    console.error('Error creating temporary booking:', error);
    throw error;
  }
}

/**
 * Get booking by ID
 * @param {string|number} bookingId - Booking ID
 * @returns {Promise<Object>} - Booking details
 */
async function getBookingById(bookingId) {
  try {
    // Using the correct table name 'bookings' (plural) and checking for ID
    const query = `
      SELECT * FROM bookings 
      WHERE id = ? OR flow_token = ? OR session_token = ?
    `;
    const [rows] = await db.execute(query, [bookingId, bookingId, bookingId]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  } catch (error) {
    console.error('Error getting booking by ID:', error);
    throw error;
  }
}

/**
 * Get booking by Razorpay order ID
 * @param {string} orderId - Razorpay order ID
 * @returns {Promise<Object>} - Booking details
 */
async function getBookingByOrderId(orderId) {
  try {
    const query = 'SELECT * FROM bookings WHERE transaction_id = ?';
    const [rows] = await db.execute(query, [orderId]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  } catch (error) {
    console.error('Error getting booking by order ID:', error);
    throw error;
  }
}

/**
 * Update booking
 * @param {string|number} bookingId - Booking ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<boolean>} - Whether update was successful
 */
async function updateBooking(bookingId, updateData) {
  try {
    // Ensure updateData is not undefined or null
    if (!updateData) {
      throw new Error('Update data cannot be null or undefined');
    }
    
    // Convert any undefined values to null
    const sanitizedData = Object.fromEntries(
      Object.entries(updateData).map(([key, value]) => [key, value === undefined ? null : value])
    );
    
    // Build dynamic update query
    const updateFields = Object.keys(sanitizedData)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = [...Object.values(sanitizedData), bookingId];
    
    const query = `UPDATE bookings SET ${updateFields}, updated_at = NOW() WHERE id = ?`;
    
    console.log('Executing update query with values:', values);
    
    const [result] = await db.execute(query, values);
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
}

/**
 * Get all bookings for a customer
 * @param {string} phone - Customer phone number
 * @returns {Promise<Array>} - Array of bookings
 */
async function getCustomerBookings(phone) {
  try {
    const query = 'SELECT * FROM bookings WHERE customer_phone = ? ORDER BY created_at DESC';
    const [rows] = await db.execute(query, [phone]);
    
    return rows;
  } catch (error) {
    console.error('Error getting customer bookings:', error);
    throw error;
  }
}

/**
 * Confirm booking after payment
 * @param {string|number} bookingId - Booking ID
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object>} - Updated booking
 */
async function confirmBooking(bookingId, paymentId) {
  try {
    const updateData = {
      status: 'confirmed',
      payment_status: 'paid',
      transaction_id: paymentId,
      payment_completed_at: new Date()
    };
    
    await updateBooking(bookingId, updateData);
    
    return await getBookingById(bookingId);
  } catch (error) {
    console.error('Error confirming booking:', error);
    throw error;
  }
}

/**
 * Get the latest pending booking for a customer
 * @param {string} phone - Customer phone number
 * @returns {Promise<Object|null>} - Latest pending booking or null
 */
async function getLatestPendingBookingByPhone(phone) {
  try {
    const query = 'SELECT * FROM bookings WHERE customer_phone = ? AND status = "pending" ORDER BY created_at DESC LIMIT 1';
    const [rows] = await db.execute(query, [phone]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  } catch (error) {
    console.error('Error getting latest pending booking:', error);
    throw error;
  }
}

module.exports = {
  createTemporaryBooking,
  getBookingById,
  getBookingByOrderId,
  updateBooking,
  getCustomerBookings,
  confirmBooking,
  getLatestPendingBookingByPhone
}; 