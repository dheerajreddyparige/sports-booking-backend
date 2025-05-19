/**
 * WhatsApp Message Templates
 * Contains predefined templates for different types of WhatsApp messages
 */

/**
 * Creates a welcome template with badminton image
 * @returns {Object} Template data object
 */
function createWelcomeTemplate() {
  return {
    header: {
      format: 'image',
      image_url: 'https://media.istockphoto.com/id/1033954336/photo/badminton-courts-with-players-competing.jpg?b=1&s=612x612&w=0&k=20&c=i2COuM0oYyXWcAgByGWFlImExjdtHiOM7orLhabf2sE='
    },
    body: {
      text: 'Welcome to Sports Booking! How can we help you today?'
    }
  };
}

/**
 * Creates an interactive list for sports selection
 * @param {string} to - Recipient's phone number
 * @returns {Object} Interactive list message object
 */
function createSportsSelectionList(to) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: 'Available Sports'
      },
      body: {
        text: 'Please select a sport to book:'
      },
      footer: {
        text: 'Tap to select a sport'
      },
      action: {
        button: 'Select Sport',
        sections: [
          {
            title: 'Sports',
            rows: [
              {
                id: 'badminton',
                title: 'Badminton',
                description: 'Indoor courts available'
              },
              {
                id: 'pickleball',
                title: 'Pickleball',
                description: 'Outdoor courts available'
              },
              {
                id: 'cricket',
                title: 'Cricket',
                description: 'Field booking available'
              },
              {
                id: 'football',
                title: 'Football',
                description: 'Field booking available'
              }
            ]
          }
        ]
      }
    }
  };
}

/**
 * Creates a button message for booking options
 * @param {string} to - Recipient's phone number
 * @returns {Object} Interactive button message object
 */
function createBookingOptionsButtons(to) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: 'What would you like to do?'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'new_booking',
              title: 'New Booking'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'view_bookings',
              title: 'View My Bookings'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'cancel_booking',
              title: 'Cancel Booking'
            }
          }
        ]
      }
    }
  };
}

/**
 * Creates a booking summary template
 * @param {Object} bookingDetails - Booking details object
 * @returns {Object} Template data object
 */
function createBookingSummaryTemplate(bookingDetails) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: bookingDetails.phoneNumber,
    type: 'text',
    text: {
      body: `Booking Summary:

Sport: ${bookingDetails.sport}
Date: ${bookingDetails.date}
Time: ${bookingDetails.time} (${bookingDetails.duration} hour${bookingDetails.duration > 1 ? 's' : ''})
Court: ${bookingDetails.court}

Price Breakdown:
Base Rate: ₹${bookingDetails.baseRate}
${bookingDetails.discountAmount ? `Discount: ₹${bookingDetails.discountAmount} (${bookingDetails.discountPercent}%)\n` : ''}${bookingDetails.dayType && bookingDetails.timePeriod ? `${bookingDetails.dayType.charAt(0).toUpperCase() + bookingDetails.dayType.slice(1)} ${bookingDetails.timePeriod} rate applied\n` : ''}Total: ₹${bookingDetails.totalPrice}`
    }
  };
}

/**
 * Creates a payment template with Razorpay integration
 * @param {Object} bookingDetails - Booking details object
 * @returns {Object} Template data object with payment button
 */
function createPaymentTemplate(bookingDetails) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: bookingDetails.phoneNumber,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: {
        type: 'text',
        text: 'Complete Your Payment'
      },
      body: {
        text: `Please complete your payment of ₹${bookingDetails.totalPrice} to confirm your booking for ${bookingDetails.sport} on ${bookingDetails.date} at ${bookingDetails.time}.`
      },
      footer: {
        text: 'Secure payment via Razorpay'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'pay_now',
              title: 'Pay Now'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'cancel_booking',
              title: 'Cancel'
            }
          }
        ]
      }
    }
  };
}

/**
 * Creates a time slot selection template with dynamic data from database
 * @param {string} to - Recipient's phone number
 * @param {string} sport - Selected sport
 * @param {string} date - Selected date
 * @param {number} duration - Duration in hours
 * @param {Array} slots - Available time slots from database
 * @returns {Object} Interactive list message object
 */
function createTimeSlotSelectionTemplate(to, sport, date, duration, slots) {
  // Ensure we don't exceed the 10 row limit
  const limitedSlots = slots.slice(0, 10);
  
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: `${sport.charAt(0).toUpperCase() + sport.slice(1)} - ${date}`
      },
      body: {
        text: `Available ${duration}-hour slots:`
      },
      footer: {
        text: `${duration} hour booking - Select a time slot`
      },
      action: {
        button: 'Select Time',
        sections: [
          {
            title: 'Available Times',
            rows: limitedSlots.map(slot => ({
              id: `slot_${slot.id}`,
              title: slot.time || slot.title,
              description: slot.court ? `${slot.court} - ₹${slot.price}` : `₹${slot.price || ''}`
            }))
          }
        ]
      }
    }
  };
}

module.exports = {
  createWelcomeTemplate,
  createSportsSelectionList,
  createBookingOptionsButtons,
  createBookingSummaryTemplate,
  createPaymentTemplate,
  createTimeSlotSelectionTemplate
};