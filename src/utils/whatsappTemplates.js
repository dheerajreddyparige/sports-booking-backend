/**
 * WhatsApp Template Utilities
 * Helps with processing and formatting WhatsApp message templates
 */

/**
 * Formats template components for WhatsApp API
 * @param {Object} templateData - Template data
 * @returns {Array} - Formatted components
 */
function formatTemplateComponents(templateData) {
  const components = [];
  
  // Add header component if present
  if (templateData.header) {
    components.push({
      type: 'header',
      parameters: formatParameters(templateData.header, 'header')
    });
  }
  
  // Add body component if present
  if (templateData.body) {
    components.push({
      type: 'body',
      parameters: formatParameters(templateData.body, 'body')
    });
  }
  
  // Add buttons component if present
  if (templateData.buttons && templateData.buttons.length > 0) {
    components.push({
      type: 'button',
      sub_type: 'quick_reply',
      index: '0',
      parameters: formatParameters(templateData.buttons[0], 'button')
    });
  }
  
  return components;
}

/**
 * Formats parameters based on component type
 * @param {Object|Array} data - Parameter data
 * @param {string} type - Component type
 * @returns {Array} - Formatted parameters
 */
function formatParameters(data, type) {
  if (!data) return [];
  
  switch (type) {
    case 'header':
      return formatHeaderParameters(data);
    case 'body':
      return formatBodyParameters(data);
    case 'button':
      return formatButtonParameters(data);
    default:
      return [];
  }
}

/**
 * Formats header parameters
 * @param {Object} header - Header data
 * @returns {Array} - Formatted parameters
 */
function formatHeaderParameters(header) {
  const parameters = [];
  
  if (header.format === 'image' && header.image_url) {
    parameters.push({
      type: 'image',
      image: { link: header.image_url }
    });
  } else if (header.format === 'document' && header.document_url) {
    parameters.push({
      type: 'document',
      document: { link: header.document_url, filename: header.filename || 'document' }
    });
  } else if (header.format === 'video' && header.video_url) {
    parameters.push({
      type: 'video',
      video: { link: header.video_url }
    });
  } else if (header.format === 'text' && header.text) {
    parameters.push({
      type: 'text',
      text: header.text
    });
  }
  
  return parameters;
}

/**
 * Formats body parameters
 * @param {Object} body - Body data
 * @returns {Array} - Formatted parameters
 */
function formatBodyParameters(body) {
  if (!body || !Array.isArray(body)) return [];
  
  return body.map(item => {
    if (typeof item === 'string') {
      return { type: 'text', text: item };
    } else if (item.type && item.value) {
      return { type: item.type, [item.type]: item.value };
    }
    return { type: 'text', text: String(item) };
  });
}

/**
 * Formats button parameters
 * @param {Object} button - Button data
 * @returns {Array} - Formatted parameters
 */
function formatButtonParameters(button) {
  if (!button || typeof button !== 'object') return [];
  
  return Object.entries(button).map(([key, value]) => ({
    type: 'text',
    text: String(value)
  }));
}

/**
 * Creates a booking confirmation template
 * @param {Object} booking - Booking data
 * @returns {Object} - Template data
 */
function createBookingConfirmationTemplate(booking) {
  return {
    header: {
      format: 'text',
      text: 'Booking Confirmation'
    },
    body: [
      `Your booking for ${booking.sport} has been confirmed.`,
      `Date: ${booking.date}`,
      `Time: ${booking.time}`,
      `Duration: ${booking.duration}`,
      `Amount: ₹${booking.amount}`
    ],
    buttons: [
      { viewDetails: 'View Details' }
    ]
  };
}

/**
 * Creates a booking reminder template
 * @param {Object} booking - Booking data
 * @returns {Object} - Template data
 */
function createBookingReminderTemplate(booking) {
  return {
    header: {
      format: 'text',
      text: 'Booking Reminder'
    },
    body: [
      `Your booking for ${booking.sport} is scheduled for tomorrow.`,
      `Date: ${booking.date}`,
      `Time: ${booking.time}`,
      `Duration: ${booking.duration}`,
      `Location: ${booking.location}`
    ],
    buttons: [
      { reschedule: 'Reschedule', cancel: 'Cancel Booking' }
    ]
  };
}

/**
 * Creates a payment confirmation template
 * @param {Object} payment - Payment data
 * @returns {Object} - Template data
 */
function createPaymentConfirmationTemplate(payment) {
  return {
    header: {
      format: 'text',
      text: 'Payment Confirmation'
    },
    body: [
      `Your payment of ₹${payment.amount} has been received.`,
      `Transaction ID: ${payment.transactionId}`,
      `Date: ${payment.date}`,
      `Payment Method: ${payment.method}`
    ],
    buttons: [
      { viewInvoice: 'View Invoice' }
    ]
  };
}

/**
 * Creates an appointment confirmation template
 * @param {Object} appointment - Appointment data
 * @returns {Object} - Template data
 */
function createAppointmentConfirmationTemplate(appointment) {
  return {
    header: {
      format: 'text',
      text: 'Appointment Confirmation'
    },
    body: [
      `Name: ${appointment.name}`,
      `Date: ${appointment.date}`,
      `Time: ${appointment.time}`,
      `PaymentMethod: ${appointment.paymentMethod}`,
      `Check the information above and confirm or cancel`,
      `Confirm in 5 mins or it will be cancelled automatically`
    ],
    buttons: [
      { confirm: 'Confirm', cancel: 'Cancel' }
    ]
  };
}

/**
 * Creates a payment instruction template
 * @param {Object} appointment - Appointment data
 * @returns {Object} - Template data
 */
function createPaymentInstructionTemplate(appointment) {
  return {
    header: {
      format: 'text',
      text: 'Payment Instructions'
    },
    body: [
      `Use Below Button to go to payment`,
      `Thank you choosing our Service`
    ],
    buttons: [
      { pay: 'Pay' }
    ]
  };
}

/**
 * Creates a welcome template with language selection
 * @returns {Object} - Template data
 */
function createWelcomeTemplate() {
  return {
    header: {
      format: 'text',
      text: 'Welcome to Notting Apps'
    },
    body: [
      `Select a Language to continue`
    ],
    buttons: [
      { english: 'English' }
    ]
  };
}

// Export the new functions
module.exports = {
  formatTemplateComponents,
  createBookingConfirmationTemplate,
  createBookingReminderTemplate,
  createPaymentConfirmationTemplate,
  createAppointmentConfirmationTemplate,
  createPaymentInstructionTemplate,
  createWelcomeTemplate
};