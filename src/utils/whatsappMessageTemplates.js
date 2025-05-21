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
 * Creates a payment template for Razorpay integration
 * @param {string} to - Recipient's phone number
 * @param {Object} bookingDetails - Booking details object
 * @param {Object} paymentDetails - Payment details including order ID
 * @returns {Object} Payment template object
 */
function createPaymentTemplate(to, bookingDetails, paymentDetails) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: {
        type: 'text',
        text: 'Booking Confirmation'
      },
      body: {
        text: `Your booking details:

Sport: ${bookingDetails.sport}
Date: ${bookingDetails.date}
Time: ${bookingDetails.time} (${bookingDetails.duration} hour${bookingDetails.duration > 1 ? 's' : ''})
Court: ${bookingDetails.court}

Price: ₹${bookingDetails.totalPrice}

Please confirm your booking by making the payment. You'll have 5 minutes to complete the payment before the booking is cancelled.`
      },
      footer: {
        text: 'Secure payment via Razorpay (UPI, Cards, Wallets)'
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
              id: 'direct_pay',
              title: 'Direct Payment'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'cancel',
              title: 'Cancel'
            }
          }
        ]
      }
    }
  };
}

/**
 * Creates a booking confirmation template
 * @param {Object} bookingDetails - Booking details object
 * @returns {Object} Template data object
 */
function createBookingConfirmationTemplate(booking) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: booking.phoneNumber,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: {
        type: 'text',
        text: 'Booking Confirmed!'
      },
      body: {
        text: `Your booking has been confirmed!\n\nBooking ID: ${booking.bookingId}\nSport: ${booking.sport}\nDate: ${booking.date}\nTime: ${booking.time}\nDuration: ${booking.duration} hour${booking.duration > 1 ? 's' : ''}\nCourt: ${booking.court}\n\nPrice Details:\nBase Rate: ₹${booking.baseRate}\n${booking.discountAmount ? `Discount: ₹${booking.discountAmount} (${booking.discountPercent}%)\n` : ''}${booking.dayType && booking.timePeriod ? `${booking.dayType.charAt(0).toUpperCase() + booking.dayType.slice(1)} ${booking.timePeriod} rate applied\n` : ''}Total: ₹${booking.totalPrice}`
      },
      footer: {
        text: 'Thank you for booking with us!'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'new_booking',
              title: 'Book Again'
            }
          }
        ]
      }
    }
  };
}

/**
 * Creates a template to display user's bookings
 * @param {string} to - Recipient's phone number
 * @param {Array} bookings - Array of user's bookings
 * @returns {Object} - User bookings template object
 */
function createUserBookingsTemplate(to, bookings) {
  // Create a formatted message with all bookings
  let bookingsText = 'Your Bookings:\n\n';
  
  if (!bookings || bookings.length === 0) {
    bookingsText = 'You have no bookings at the moment.';
  } else {
    bookings.forEach((booking, index) => {
      const bookingDate = new Date(booking.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
      
      bookingsText += `${index + 1}. ${booking.sport.charAt(0).toUpperCase() + booking.sport.slice(1)}\n`;
      bookingsText += `   Date: ${bookingDate}\n`;
      bookingsText += `   Time: ${booking.startTime} - ${booking.endTime}\n`;
      bookingsText += `   Status: ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}\n`;
      bookingsText += `   Payment: ${booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}\n\n`;
    });
  }
  
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: {
        type: 'text',
        text: 'My Bookings'
      },
      body: {
        text: bookingsText
      },
      footer: {
        text: 'Sports Booking App'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'new_booking',
              title: 'New Booking'
            }
          }
        ]
      }
    }
  };
}

/**
 * Creates a Razorpay payment link template
 * @param {string} to - Recipient's phone number
 * @param {Object} bookingDetails - Booking details
 * @param {Object} paymentDetails - Payment details including Razorpay order ID
 * @returns {Object} - Razorpay payment link template
 */
function createRazorpayLinkTemplate(to, bookingDetails, paymentDetails) {
  // Create a deep link to Razorpay checkout
  const razorpayParams = {
    key: process.env.RAZORPAY_KEY_ID,
    amount: Math.round(bookingDetails.totalPrice * 100),
    currency: 'INR',
    name: 'Sports Booking',
    description: `Booking for ${bookingDetails.sport} on ${bookingDetails.date}`,
    order_id: paymentDetails.orderId,
    prefill: {
      contact: bookingDetails.phoneNumber.replace('+', ''),
    },
    notes: {
      booking_id: bookingDetails.bookingId || '',
      sport: bookingDetails.sport,
      date: bookingDetails.date,
      time: bookingDetails.time
    },
    theme: {
      color: '#3399cc'
    }
  };
  
  // Create a URL with base64 encoded parameters
  const encodedParams = Buffer.from(JSON.stringify(razorpayParams)).toString('base64');
  const paymentLink = `https://rzp.io/i/checkout?data=${encodedParams}`;
  
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      body: `Please complete your payment using the link below. You have 5 minutes to complete the payment.\n\nPayment Link: ${paymentLink}\n\nAfter payment, your booking will be automatically confirmed.`
    }
  };
}

/**
 * Creates a payment status template
 * @param {string} to - Recipient's phone number
 * @param {string} status - Payment status (success, failed, pending)
 * @param {Object} bookingDetails - Booking details
 * @returns {Object} - Payment status template
 */
function createPaymentStatusTemplate(to, status, bookingDetails) {
  let headerText = 'Payment Status';
  let bodyText = '';
  let footerText = 'Sports Booking App';
  
  // Format time display with start and end times if available
  const timeDisplay = bookingDetails.startTime && bookingDetails.endTime
    ? `${bookingDetails.time} (${bookingDetails.startTime} - ${bookingDetails.endTime})`
    : bookingDetails.time;
    
  switch (status) {
    case 'success':
      headerText = 'Payment Successful';
      bodyText = `Your payment of ₹${bookingDetails.totalPrice} for ${bookingDetails.sport} booking on ${bookingDetails.date} at ${timeDisplay} has been successfully processed.\n\nBooking Details:\n• Duration: ${bookingDetails.duration} hour${bookingDetails.duration > 1 ? 's' : ''}\n• Court: ${bookingDetails.court}\n\nYour booking is now confirmed!`;
      break;
    case 'failed':
      headerText = 'Payment Failed';
      bodyText = `Your payment for ${bookingDetails.sport} booking on ${bookingDetails.date} at ${timeDisplay} has failed.\n\nPlease try again or choose a different payment method.`;
      break;
    case 'pending':
      headerText = 'Payment Pending';
      bodyText = `Your payment for ${bookingDetails.sport} booking on ${bookingDetails.date} at ${timeDisplay} is pending.\n\nBooking Details:\n• Duration: ${bookingDetails.duration} hour${bookingDetails.duration > 1 ? 's' : ''}\n• Court: ${bookingDetails.court}\n\nWe'll notify you once the payment is confirmed.`;
      break;
    default:
      bodyText = `Status of your payment for ${bookingDetails.sport} booking: ${status}`;
  }
  
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: {
        type: 'text',
        text: headerText
      },
      body: {
        text: bodyText
      },
      footer: {
        text: footerText
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'new_booking',
              title: 'New Booking'
            }
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
  createBookingConfirmationTemplate,
  createUserBookingsTemplate,
  createRazorpayLinkTemplate,
  createPaymentStatusTemplate
};