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
        "time_of_day_options": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {"type": "string"},
              "title": {"type": "string"}
            }
          },
          "__example__": [
            {"id": "morning", "title": "Morning"},
            {"id": "afternoon", "title": "Afternoon"},
            {"id": "evening", "title": "Evening"}
          ]
        },
        "time_slots": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {"type": "string"},
              "title": {"type": "string"},
              "session": {"type": "string", "enum": ["morning", "evening"]}
            }
          },
          "__example__": [
            {"id": "09:00-10:00", "title": "9:00 AM - 10:00 AM", "session": "morning"},
            {"id": "10:00-11:00", "title": "10:00 AM - 11:00 AM", "session": "morning"},
            {"id": "17:00-18:00", "title": "5:00 PM - 6:00 PM", "session": "evening"},
            {"id": "18:00-19:00", "title": "6:00 PM - 7:00 PM", "session": "evening"}
          ]
        },
        "sport": {
          "type": "string",
          "__example__": ""
        },
        "date": {
          "type": "string",
          "__example__": ""
        },
        "duration": {
          "type": "string",
          "__example__": ""
        },
        "time_of_day": {
          "type": "string",
          "__example__": ""
        },
        "is_date_visible": {
          "type": "boolean",
          "__example__": false
        },
        "is_duration_visible": {
          "type": "boolean",
          "__example__": false
        },
        "is_time_of_day_visible": {
          "type": "boolean",
          "__example__": false
        },
        "is_time_slots_visible": {
          "type": "boolean",
          "__example__": false
        },
        "is_footer_enabled": {
          "type": "boolean",
          "__example__": false
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
            "on-select-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${form.sport}",
                "is_date_visible": true,
                "date": "",
                "duration": "",
                "time_of_day": "",
                "is_duration_visible": false,
                "is_time_of_day_visible": false,
                "is_time_slots_visible": false,
                "is_footer_enabled": false
              }
            }
          },
          {
            "type": "DatePicker",
            "name": "date",
            "label": "Select Date",
            "required": "${data.is_date_visible}",
            "visible": "${data.is_date_visible}",
            "on-select-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${data.sport}",
                "date": "${form.date}",
                "is_duration_visible": true
              }
            }
          },
          {
            "type": "Dropdown",
            "name": "duration",
            "label": "Select Duration",
            "data-source": "${data.durations}",
            "required": "${data.is_duration_visible}",
            "visible": "${data.is_duration_visible}",
            "on-select-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${data.sport}",
                "date": "${data.date}",
                "duration": "${form.duration}",
                "is_time_of_day_visible": true
              }
            }
          },
          {
            "type": "RadioButtonsGroup",
            "name": "time_of_day",
            "label": "Select Time of Day",
            "data-source": "${data.time_of_day_options}",
            "required": "${data.is_time_of_day_visible}",
            "visible": "${data.is_time_of_day_visible}",
            "on-select-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${data.sport}",
                "date": "${data.date}",
                "duration": "${data.duration}",
                "time_of_day": "${form.time_of_day}",
                "is_time_slots_visible": true
              }
            }
          },
          {
            "type": "ChipsSelector",
            "name": "time_slots",
            "label": "Available Time Slots",
            "data-source": "${data.time_slots}",
            "required": "${data.is_time_slots_visible}",
            "max-selected-items": 1,
            "visible": "${data.is_time_slots_visible}",
            "enabled": "${data.is_time_slots_visible}"
          },
          {
            "type": "TextBody",
            "text": "📞 For bulk bookings, Contact: 9876543210"
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
            "enabled": "${data.is_footer_enabled}",
            "on-click-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${data.sport}",
                "date": "${data.date}",
                "duration": "${data.duration}",
                "time_of_day": "${data.time_of_day}",
                "time_slots": "${data.time_slots}"
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
          "__example__": 855
        },
        "discount_info": {
          "type": "string",
          "__example__": "5% off for 2-hour booking"
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
            "text": "Sport: ${screen.data.sport}\nDate: ${screen.data.date}\nDuration: ${screen.data.duration}\nTime of Day: ${screen.data.time_of_day}\nTime Slot: ${screen.data.time_slots}\nRates:\n${data.rates}\nTotal Amount: ₹${data.total_amount}\n${data.discount_info}"
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
              {"id": "cancellation", "title": "I agree to the Cancellation Policy"}
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
              {"id": "terms", "title": "I agree to the Terms & Conditions"}
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
                "time_of_day": "${screen.data.time_of_day}",
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
          "__example__": "[invalid url, do not cite]"
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