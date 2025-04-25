/**
 * WhatsApp Flow Configuration
 * Based on the appointment flow structure
 */

const WHATSAPP_FLOW ={
  "version": "7.0",
  "data_api_version": "3.0",
  "routing_model": {
    "BOOKING": ["SUMMARY"],
    "SUMMARY": ["SUCCESS"],
    "SUCCESS": []
  },
  "screens": [
    {
      "id": "BOOKING",
      "title": "🍕 Welcome to PITZONE Booking",
      "data": {
        "sports": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {"type": "string"},
              "title": {"type": "string"},
              "image": {"type": "string"},
              "alt-text": {"type": "string"}
            }
          },
          "__example__": [
            {"id": "badminton", "title": "Badminton", "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "alt-text": "Badminton court"},
            {"id": "cricket", "title": "Cricket", "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "alt-text": "Cricket field"},
            {"id": "pickleball", "title": "Pickleball", "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "alt-text": "Pickleball court"}
          ]
        },
        "durations": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {"type": "string"},
              "title": {"type": "string"}
            }
          },
          "__example__": [
            {"id": "1", "title": "1 Hour"},
            {"id": "1.5", "title": "1.5 Hours"},
            {"id": "2", "title": "2 Hours (5% off)"},
            {"id": "2.5", "title": "2.5 Hours (5% off)"},
            {"id": "3", "title": "3 Hours (10% off)"},
            {"id": "3.5", "title": "3.5 Hours (10% off)"},
            {"id": "4", "title": "4 Hours (15% off)"}
          ]
        },
        "time_slots": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {"type": "string"},
              "title": {"type": "string"},
              "start": {"type": "string"},
              "end": {"type": "string"}
            }
          },
          "__example__": [
            {"id": "10:00-11:30", "title": "10:00 AM - 11:30 AM", "start": "10:00", "end": "11:30"},
            {"id": "13:00-14:30", "title": "1:00 PM - 2:30 PM", "start": "13:00", "end": "14:30"},
            {"id": "17:00-18:30", "title": "5:00 PM - 6:30 PM", "start": "17:00", "end": "18:30"}
          ]
        }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "Image",
            "src": "",
            "width": 200,
            "height": 200,
            "alt-text": "PITZONE Logo"
          },
          {
            "type": "TextHeading",
            "text": "Select Sport, Date & Time"
          },
          {
            "type": "RadioButtonsGroup",
            "name": "sport",
            "label": "Select Sport",
            "data-source": "${data.sports}",
            "required": true,
            "image-source": "${data.sports.image}",
            "alt-text-source": "${data.sports.alt-text}",
            "on-select-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${screen.data.sport}"
              }
            }
          },
          {
            "type": "DatePicker",
            "name": "date",
            "label": "Select Date",
            "required": true,
            "on-select-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${screen.data.sport}",
                "date": "${screen.data.date}"
              }
            }
          },
          {
            "type": "Dropdown",
            "name": "duration",
            "label": "Select Duration",
            "data-source": "${data.durations}",
            "required": true,
            "on-select-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${screen.data.sport}",
                "date": "${screen.data.date}",
                "duration": "${screen.data.duration}"
              }
            }
          },
          {
            "type": "ChipsSelector",
            "name": "time_slots",
            "label": "Available Time Slots",
            "data-source": "${data.time_slots}",
            "required": true,
            "max-selected-items": 1
          },
          {
            "type": "TextBody",
            "text": "📞 For bulk bookings (2+ hours), contact: 9876543210"
          },
          {
            "type": "EmbeddedLink",
            "text": "💰 View Rates",
            "on-click-action": {
              "name": "open_url",
              "url": "https://example.com/rates"
            }
          },
          {
            "type": "Footer",
            "label": "Continue",
            "on-click-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${screen.data.sport}",
                "date": "${screen.data.date}",
                "duration": "${screen.data.duration}",
                "time_slots": "${screen.data.time_slots}"
              }
            }
          }
        ]
      }
    },
    {
      "id": "SUMMARY",
      "title": "✅ Booking Summary",
      "data": {
        "total_amount": {
          "type": "number",
          "__example__": 855.00
        },
        "rates": {
          "type": "string",
          "__example__": "Badminton: Weekday Morning ₹300/hr, Evening ₹350/hr; Weekend Morning ₹400/hr, Evening ₹450/hr\nCricket: Weekday Morning ₹1500/hr, Evening ₹1800/hr; Weekend Morning ₹2000/hr, Evening ₹2200/hr\nPickleball: Weekday Morning ₹200/hr, Evening ₹250/hr; Weekend Morning ₹300/hr, Evening ₹350/hr"
        },
        "cancellation_policy": {
          "type": "string",
          "__example__": "100% refund: Cancel >2 hours before booking.\n75% refund: Cancel 1-2 hours before.\nNo refund: Cancel <1 hour before."
        },
        "terms": {
          "type": "string",
          "__example__": "No refunds after booking unless canceled as per policy.\nArrive 10 minutes early."
        }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "TextHeading",
            "text": "Your Booking Details"
          },
          {
            "type": "TextBody",
            "text": "Sport: ${screen.data.sport}\nDate: ${screen.data.date}\nDuration: ${screen.data.duration}\nTime Slot: ${screen.data.time_slots}\nRates:\n${data.rates}\nTotal Amount: ₹${data.total_amount}\n${data.discount_info}"
          },
          {
            "type": "TextInput",
            "name": "name",
            "label": "Full Name *",
            "required": true
          },
          {
            "type": "TextInput",
            "name": "phone",
            "label": "Phone Number *",
            "required": true,
            "input-type": "phone"
          },
          {
            "type": "TextInput",
            "name": "email",
            "label": "Email (Optional)",
            "input-type": "email"
          },
          {
            "type": "CheckboxGroup",
            "name": "agree_cancellation",
            "label": "Cancellation Policy Agreement",
            "data-source": [
              {"id": "cancellation", "title": "I agree to the icy"}
            ],
            "required": true
          },
          {
            "type": "TextBody",
            "text": "Cancellation Policy:\n${data.cancellation_policy}"
          },
          {
            "type": "CheckboxGroup",
            "name": "agree_terms",
            "label": "Terms & Conditions Agreement",
            "data-source": [
              {"id": "terms", "title": "I agree to the"}
            ],
            "required": true
          },
          {
            "type": "TextBody",
            "text": "Terms & Conditions:\n${data.terms}"
          },
          {
            "type": "Footer",
            "label": "Pay with Razorpay",
            "on-click-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${screen.data.sport}",
                "date": "${screen.data.date}",
                "duration": "${screen.data.duration}",
                "time_slots": "${screen.data.time_slots}",
                "total_amount": "${data.total_amount}",
                "discount_info": "${data.discount_info}",
                "name": "${screen.data.name}",
                "phone": "${screen.data.phone}",
                "email": "${screen.data.email}",
                "agree_cancellation": "${screen.data.agree_cancellation}",
                "agree_terms": "${screen.data.agree_terms}"
              }
            }
          }
        ]
      }
    },
    {
      "id": "SUCCESS",
      "title": "🎉 Booking Confirmed!",
      "terminal": true,
      "data": {
        "invoice_url": {
          "type": "string",
          "__example__": "https://www.pitzone.com"
        }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "TextHeading",
            "text": "Booking Successful!"
          },
          {
            "type": "TextBody",
            "text": "Your invoice is being sent to your WhatsApp."
          },
          {
            "type": "EmbeddedLink",
            "text": "Download Invoice",
            "on-click-action": {
              "name": "open_url",
              "url": "${data.invoice_url}"
            }
          },
          {
            "type": "Footer",
            "label": "Close",
            "on-click-action": {
              "name": "complete"
            }
          }
        ]
      }
    }
  ]
};

module.exports = WHATSAPP_FLOW;