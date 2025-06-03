/**
 * WhatsApp Payment Flow Utilities
 * Utilities for creating payment messages in WhatsApp
 */

/**
 * Create a payment options message with multiple payment methods
 * @param {string} to - Phone number to send message to
 * @param {Object} bookingData - Booking data
 * @returns {Object} - Message object
 */
function createPaymentOptionsMessage(to, bookingData) {
  const {
    booking_id,
    sport,
    date,
    time_slot,
    total_amount,
    name,
    duration
  } = bookingData;

  // Format date for display
  const formattedDate = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Create a unique reference ID based on booking ID
  const referenceId = booking_id || `BOOKING_${Date.now()}`;
  
  // Format time slot
  const timeStart = time_slot;
  const timeEnd = calculateEndTime(time_slot, duration || 1);

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "button",
      header: {
        type: "text",
        text: "Payment Options 💸"
      },
      body: {
        text: `Thank you for booking a ${sport || 'sports'} court on ${formattedDate} from ${timeStart} to ${timeEnd}.\n\nPlease select your preferred payment method to complete your booking.`
      },
      footer: {
        text: `Booking ID: ${referenceId} | Amount: ₹${total_amount || '0'}`
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "pay_upi",
              title: "UPI"
            }
          },
          {
            type: "reply",
            reply: {
              id: "pay_razorpay",
              title: "Card/Net Banking"
            }
          }
        ]
      }
    }
  };
}

/**
 * Create a UPI payment message
 * @param {string} to - Phone number to send message to
 * @param {Object} bookingData - Booking data
 * @param {string} upiLink - UPI payment link
 * @returns {Object} - Message object
 */
function createUpiPaymentMessage(to, bookingData, upiLink) {
  const {
    id,
    booking_id,
    sport,
    date,
    start_time,
    amount,
    customer_name
  } = bookingData;

  // Create a unique reference ID based on booking ID - ensure it's a string
  const referenceId = (booking_id || id || `UPI_${Date.now()}`).toString();
  
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "order_details",
      header: {
        type: "text",
        text: "UPI Payment"
      },
      body: {
        text: `Please complete your payment for ${sport || 'sports'} booking on ${date} at ${start_time}. Click Pay to proceed with UPI payment.`
      },
      footer: {
        text: `Booking ID: ${referenceId}`
      },
      action: {
        name: "pay",
        parameters: {
          reference_id: referenceId,
          payment_configuration_name: "PitZone_Upi",
          payment_type: "UPI",
          amount: {
            value: (amount || 0) * 100,
            offset: 100
          },
          upi: {
            target_url: upiLink
          }
        }
      }
    }
  };
}

/**
 * Create a Razorpay payment message
 * @param {string} to - Phone number to send message to
 * @param {Object} bookingData - Booking data
 * @param {string} orderId - Razorpay order ID
 * @returns {Object} - Message object
 */
function createRazorpayPaymentMessage(to, bookingData, orderId) {
  const {
    id,
    booking_id,
    sport,
    date,
    start_time,
    amount,
    customer_name
  } = bookingData;

  // Create a unique reference ID based on booking ID - ensure it's a string
  const referenceId = (booking_id || id || `RZP_${Date.now()}`).toString();
  
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "order_details",
      header: {
        type: "text",
        text: "Complete Payment"
      },
      body: {
        text: `Please complete your payment for ${sport || 'sports'} booking on ${date} at ${start_time}.`
      },
      footer: {
        text: `Booking ID: ${referenceId}`
      },
      action: {
        name: "review_and_pay",
        parameters: {
          reference_id: referenceId,
          type: "digital-goods",
          payment_settings: [
            {
              type: "payment_gateway",
              payment_gateway: {
                type: "razorpay",
                configuration_name: "pitzone_razorpay",
                razorpay: {
                  receipt: referenceId,
                  notes: {
                    booking_id: String(booking_id || id || ''),
                    order_id: orderId,
                    date: date || '',
                    time: start_time || '',
                    customer_name: customer_name || ''
                  }
                }
              }
            }
          ],
          currency: "INR",
          total_amount: {
            value: (amount || 0) * 100,
            offset: 100
          },
          order: {
            status: "pending",
            items: [
              {
                name: `${sport || 'Sports'} Court Booking`,
                amount: {
                  value: (amount || 0) * 100,
                  offset: 100
                },
                quantity: 1
              }
            ],
            subtotal: {
              value: (amount || 0) * 100,
              offset: 100
            },
            tax: {
              value: 0,
              offset: 100,
              description: "No tax"
            }
          }
        }
      }
    }
  };
}

/**
 * Calculate end time based on start time and duration
 * @param {string} startTime - Start time (HH:MM format)
 * @param {number} durationHours - Duration in hours
 * @returns {string} - End time (HH:MM format)
 */
function calculateEndTime(startTime, durationHours) {
  try {
    // Parse start time
    const [hours, minutes] = startTime.split(':').map(Number);
    
    // Create date object with today's date and start time
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    // Add duration
    date.setTime(date.getTime() + (durationHours * 60 * 60 * 1000));
    
    // Format end time
    const endHours = date.getHours().toString().padStart(2, '0');
    const endMinutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${endHours}:${endMinutes}`;
  } catch (error) {
    console.error('Error calculating end time:', error);
    return startTime; // Return start time as fallback
  }
}

module.exports = {
  createPaymentOptionsMessage,
  createUpiPaymentMessage,
  createRazorpayPaymentMessage,
  calculateEndTime
}; 