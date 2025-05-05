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
              "description": {"type": "string"},
              "metadata": {"type": "string"}
            }
          },
          "__example__": [
            {"id": "badminton", "title": "Badminton", "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "description": "Badminton court", "metadata": "Annual Fee: $50"}
           ]
        },
        "durations": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {"type": "string"},
              "title": {"type": "string"},
              "description": {"type": "string"},
              "metadata": {"type": "string"}
            }
          },
          "__example__": [
            {"id": "1", "title": "1 Hour", "description":"","metadata": "" }
          ]
        },
        "time_slots": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {"type": "string"},
              "title": {"type": "string"}
            }
          },
          "__example__": [
            {"id": "09:00-10:00", "title": "9:00 AM - 10:00 AM","enabled": false}
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
         "time_slot": {
          "type": "string",
          "__example__": ""
        },
        "is_date_enabled": {
          "type": "boolean",
          "__example__": false
        },
        "is_duration_enabled": {
          "type": "boolean",
          "__example__": false
        },
        "is_time_slots_enabled": {
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
             "type": "Dropdown",
             "name": "sport",
             "required": true,
             "data-source": "${data.sports}",
             "label": "Select Sports",
             "on-select-action": {
                "name":"data_exchange",
                "payload": {
                "sport": "${form.sport}"
               }
             }
           },
          
        
          {
            "type": "DatePicker",
            "name": "date",
            "label": "Select Date",
            "required": "${data.is_date_enabled}",
            "enabled": "${data.is_date_enabled}",
            "visible": "${data.is_date_enabled}",
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
            "required": "${data.is_duration_enabled}",
            "enabled": "${data.is_duration_enabled}",
            "visible": "${data.is_duration_enabled}",
            "on-select-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${data.sport}",
                "date": "${data.date}",
                "duration": "${form.duration}",
                "is_time_slots_enabled": true
              }
            }
          },
           {
            "type": "Dropdown",
            "name": "time_slot",
            "label": "Select Time",
            "data-source": "${data.time_slots}",
            "required": "${data.is_time_slots_enabled}",
            "visible": "${data.is_time_slots_enabled}",
            "on-select-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${data.sport}",
                "date": "${data.date}",
                "duration": "${data.duration}",
                "time_slot": "${form.time_slot}"
              }
            }
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
            "on-click-action": {
             "name": "data_exchange",
              "payload": {
                "sport": "${data.sport}",
                "date": "${data.date}",
                "duration": "${data.duration}",
                "time_slot": "${data.time_slot}"
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
         "sport": {
          "type": "string",
          "__example__": "123"
        },
            "date": {
          "type": "string",
          "__example__": "123"
        },
            "duration": {
          "type": "string",
          "__example__": "123"
        },
            "time_slot": {
          "type": "string",
          "__example__": "123"
        },
        "total_amount": {
          "type": "number",
          "__example__": 855
        },
        "discount_info": {
          "type": "string",
          "__example__": "5% off for 2-hour booking"
        },
        "rate_info": {
          "type": "string",
          "__example__": "Weekend evening rate applied"
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
            "text": "${data.sport}"
          },
          {
            "type": "TextBody",
            "text": "Sport: ${data.sport}\nDate: ${data.date}\nDuration: ${data.duration} Hour(s)\nTime Slot: ${data.time_slot}\n${data.rate_info}\nTotal Amount: ₹${data.total_amount}\n${data.discount_info}"
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
                "time_slot": "${data.time_slot}",
                "total_amount": "${data.total_amount}",
                "discount_info": "${data.discount_info}",
                "rate_info": "${data.rate_info}",
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