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
    const {
      sport,
      date,
      time_slot,
      duration,
      total_amount,
      name,
      email,
      phone,
      payment_method,
      booking_id,
      status,
      payment_status,
      flow_token
    } = bookingData;
    
    // Insert into bookings table
    const query = `
      INSERT INTO bookings (
        booking_id, 
        sport, 
        booking_date, 
        time_slot, 
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const values = [
      booking_id,
      sport,
      date,
      time_slot,
      duration,
      total_amount,
      name,
      email,
      phone,
      payment_method,
      status,
      payment_status,
      flow_token
    ];
    
    const [result] = await db.execute(query, values);
    
    // Get inserted booking
    return await getBookingById(booking_id);
  } catch (error) {
    console.error('Error creating temporary booking:', error);
    throw error;
  }
}

/**
 * Get booking by ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} - Booking details
 */
async function getBookingById(bookingId) {
  try {
    const query = 'SELECT * FROM bookings WHERE booking_id = ?';
    const [rows] = await db.execute(query, [bookingId]);
    
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
    const query = 'SELECT * FROM bookings WHERE razorpay_order_id = ?';
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
 * @param {string} bookingId - Booking ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<boolean>} - Whether update was successful
 */
async function updateBooking(bookingId, updateData) {
  try {
    // Build dynamic update query
    const updateFields = Object.keys(updateData)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = [...Object.values(updateData), bookingId];
    
    const query = `UPDATE bookings SET ${updateFields}, updated_at = NOW() WHERE booking_id = ?`;
    
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
 * @param {string} bookingId - Booking ID
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object>} - Updated booking
 */
async function confirmBooking(bookingId, paymentId) {
  try {
    const updateData = {
      status: 'confirmed',
      payment_status: 'completed',
      payment_id: paymentId
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