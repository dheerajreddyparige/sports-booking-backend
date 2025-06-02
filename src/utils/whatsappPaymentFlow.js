/**
 * WhatsApp Payment Flow
 * Handles payment flow after the WhatsApp Flow is completed
 */

/**
 * Creates a payment options message with UPI and Razorpay options
 * @param {string} to - Recipient's phone number
 * @param {Object} bookingData - Booking data from flow completion
 * @returns {Object} - Interactive payment options message
 */
function createPaymentOptionsMessage(to, bookingData) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "button",
      header: {
        type: "text",
        text: "Payment Options"
      },
      body: {
        text: `Please select your payment method for your ${bookingData.sport} booking on ${bookingData.date} at ${bookingData.time_slot}.\n\nAmount: ₹${bookingData.total_amount}`
      },
      footer: {
        text: "Secure payment options"
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "pay_upi",
              title: "Pay with UPI"
            }
          },
          {
            type: "reply",
            reply: {
              id: "pay_razorpay",
              title: "Pay with Razorpay"
            }
          }
        ]
      }
    }
  };
}

/**
 * Creates a payment message with UPI link
 * @param {string} to - Recipient's phone number
 * @param {Object} bookingData - Booking data
 * @param {string} upiLink - Generated UPI payment link
 * @returns {Object} - UPI payment message
 */
function createUpiPaymentMessage(to, bookingData, upiLink) {
  // Get payment configuration from environment variables
  const paymentConfigId = process.env.WHATSAPP_PAYMENT_CONFIGURATION_ID || '1750678955481520';
  
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
        text: `Please complete your payment of ₹${bookingData.total_amount} using the UPI link below.`
      },
      footer: {
        text: "Click below to pay"
      },
      action: {
        name: "pay",
        parameters: {
          payment_configuration_id: paymentConfigId,
          payment_type: "UPI",
          payment_gateway: "upi",
          customer_email: bookingData.email,
          customer_name: bookingData.name,
          booking_ref: bookingData.booking_id || "BK" + Date.now(),
          transaction_amount: {
            amount: bookingData.total_amount,
            currency: "INR"
          },
          payment_link: upiLink
        }
      }
    }
  };
}

/**
 * Creates a payment message with Razorpay gateway
 * @param {string} to - Recipient's phone number
 * @param {Object} bookingData - Booking data
 * @param {string} orderId - Razorpay order ID
 * @returns {Object} - Razorpay payment message
 */
function createRazorpayPaymentMessage(to, bookingData, orderId) {
  // Get payment configuration from environment variables
  const paymentConfigId = process.env.WHATSAPP_PAYMENT_CONFIGURATION_ID || '1750678955481520';
  const razorpayMerchantId = process.env.RAZORPAY_MERCHANT_ID || 'acc_PX637rs8HXQBWa';
  
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "order_details",
      header: {
        type: "text",
        text: "Card/Net Banking Payment"
      },
      body: {
        text: `Please complete your payment of ₹${bookingData.total_amount} using Razorpay secure gateway.`
      },
      footer: {
        text: "Click below to pay"
      },
      action: {
        name: "pay",
        parameters: {
          payment_configuration_id: paymentConfigId,
          payment_type: "RAZORPAY",
          payment_gateway: "razorpay",
          payment_gateway_merchant_id: razorpayMerchantId,
          customer_email: bookingData.email,
          customer_name: bookingData.name,
          booking_ref: bookingData.booking_id || "BK" + Date.now(),
          transaction_amount: {
            amount: bookingData.total_amount,
            currency: "INR"
          },
          merchant_order_id: orderId
        }
      }
    }
  };
}

/**
 * Creates a WhatsApp Flow message
 * @param {string} to - Recipient's phone number
 * @param {string} flowId - WhatsApp Flow ID
 * @param {Object} data - Initial data for the flow
 * @returns {Object} - Flow message object
 */
function createFlowMessage(to, flowId, data = {}) {
  return {
    messaging_product: "whatsapp",
    to: to,
    recipient_type: "individual",
    type: "interactive",
    interactive: {
      type: "flow",
      header: {
        type: "text",
        text: "Book Your Sports Session"
      },
      body: {
        text: "Welcome to PitZone Sports Booking. Complete the form to book your sports session."
      },
      footer: {
        text: "PitZone Sports"
      },
      action: {
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_action: "navigate",
          flow_token: "booking_" + Date.now(),
          flow_id: flowId,
          flow_cta: "Book Now",
          flow_action_payload: {
            screen: "BOOKING",
            data: data
          }
        }
      }
    }
  };
}

module.exports = {
  createPaymentOptionsMessage,
  createUpiPaymentMessage,
  createRazorpayPaymentMessage,
  createFlowMessage
}; 