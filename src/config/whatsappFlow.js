/**
 * WhatsApp Flow Configuration
 * Based on the appointment flow structure
 */

const WHATSAPP_FLOW ={
  "version": "7.0",
  "data_api_version": "3.0",
  "routing_model": {
    "BOOKING": [
      "DETAILS"
    ],
    "DETAILS": [
      "SUMMARY"
    ],
    "SUMMARY": []
  },
  "screens": [
    {
      "id": "BOOKING",
      "title": "🏸 PitZone Sports Booking",
      "data": {
        "sports": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "title": {
                "type": "string"
              },
              "image": {
                "type": "string"
              },
              "description": {
                "type": "string"
              },
              "metadata": {
                "type": "string"
              }
            }
          },
          "__example__": [
            {
              "id": "badminton",
              "title": "Badminton",
              "image": "",
              "description": "Badminton court",
              "metadata": "₹500/hr"
            }
          ]
        },
        "durations": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "title": {
                "type": "string"
              },
              "description": {
                "type": "string"
              },
              "metadata": {
                "type": "string"
              }
            }
          },
          "__example__": [
            {
              "id": "1",
              "title": "1 Hour",
              "description": "Perfect for warm up",
              "metadata": ""
            }
          ]
        },
        "time_slots": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "title": {
                "type": "string"
              }
            }
          },
          "__example__": [
            {
              "id": "No slots available",
              "title": "Error"
            }
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
        },
        "min_date": {
          "type": "string",
          "__example__": "2023-01-01"
        },
        "max_date": {
          "type": "string",
          "__example__": "2023-12-31"
        }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "TextHeading",
            "text": "Book Your Sports Session"
          },
          {
            "type": "Dropdown",
            "name": "sport",
            "required": true,
            "data-source": "${data.sports}",
            "label": "Select Sport",
            "on-select-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${form.sport}",
                "is_date_enabled": true
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
            "min-date": "${data.min_date}",
            "max-date": "${data.max_date}",
            "on-select-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${data.sport}",
                "date": "${form.date}",
                "is_duration_enabled": true
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
            "label": "Select Time Slot",
            "data-source": "${data.time_slots}",
            "required": "${data.is_time_slots_enabled}",
            "visible": "${data.is_time_slots_enabled}",
            "enabled": "${data.is_time_slots_enabled}",
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
            "type": "Footer",
            "label": "Continue",
            "on-click-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${data.sport}",
                "date": "${data.date}",
                "duration": "${data.duration}",
                "time_slot": "${data.time_slot}",
                 "is_footer_enabled": true

              }
            }
          }
        ]
      }
    },
    {
      "id": "DETAILS",
      "title": "👤 Customer Details",
      "data": {
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
        "total_amount": {
          "type": "string",
          "__example__": ""
        },
        "discount_info": {
          "type": "string",
          "__example__": ""
        },
        "name": {
          "type": "string",
          "__example__": ""
        },
        "phone": {
          "type": "string",
          "__example__": ""
        },
        "email": {
          "type": "string",
          "__example__": ""
        },
        "is_existing_customer": {
          "type": "boolean",
          "__example__": false
        },
        "show_new_customer_message": {
          "type": "boolean",
          "__example__": false
        },
        "show_existing_customer_message": {
          "type": "boolean",
          "__example__": false
        },
        "is_name_filled": {
          "type": "boolean",
          "__example__": false
        },
        "is_phone_filled": {
          "type": "boolean",
          "__example__": false
        },
        "is_footer_enabled": {
          "type": "boolean",
          "__example__": true
        },
        "original_amount": {
          "type": "string",
          "__example__": ""
        }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "TextHeading",
            "text": "Customer Information"
          },
          {
            "type": "TextBody",
            "text": "Please provide your contact details to complete the booking.",
            "visible": "${data.show_new_customer_message}"
          },
          {
            "type": "TextBody",
            "text": "Welcome back! Your details are pre-filled.",
            "visible": "${data.show_existing_customer_message}"
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
            "label": "Email Address *",
            "required": true,
            "input-type": "email"
          },
          {
            "type": "Footer",
            "label": "Continue",
            "on-click-action": {
              "name": "data_exchange",
              "payload": {
                "name": "${form.name}",
                "phone": "${form.phone}",
                "email": "${form.email}",
                "update_customer_fields": true
              }
            }
          }
        ]
      }
    },
    {
      "id": "SUMMARY",
      "title": "✅ Booking Summary",
      "terminal": true,
      "data": {
        "bookingdetails": {
          "type": "string",
          "__example__": ""
        },
        "customerdetails": {
          "type": "string",
          "__example__": ""
        },
        "paymentdetails": {
          "type": "string",
          "__example__": ""
        },
        "time_slot": {
          "type": "string",
          "__example__": ""
        },
        "total_amount": {
          "type": "string",
          "__example__": ""
        },
        "discount_info": {
          "type": "string",
          "__example__": ""
        },
        "name": {
          "type": "string",
          "__example__": "asfd"
        },
        "phone": {
          "type": "string",
          "__example__": "asf"
        },
        "email": {
          "type": "string",
          "__example__": "asf"
        },
        "original_amount": {
          "type": "string",
          "__example__": ""
        },
        "razorpay_mid": {
          "type": "string",
          "__example__": "acc_PX637rs8HXQBWa"
        },
        "whatsapp_business_id": {
          "type": "string",
          "__example__": "1750678955481520"
        }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "TextHeading",
            "text": "Booking Summary"
          },
          {
            "type": "TextBody",
            "text": "${data.bookingdetails}"
          },
          {
            "type": "TextBody",
            "text": "${data.customerdetails}"
          },
          {
            "type": "TextBody",
            "text": "${data.paymentdetails}"
          },
          {
            "type": "OptIn",
            "name": "agree_terms",
            "label": "I agree to terms",
            "required": true,
            "on-click-action": {
              "name": "open_url",
              "url": "https://pitzone-sports.com/terms"
            }
          },
          {
            "type": "OptIn",
            "name": "agree_cancellation",
            "label": "I agree to cancellation",
            "required": true,
            "on-click-action": {
              "name": "open_url",
              "url": "https://pitzone-sports.com/cancellation"
            }
          },
          {
            "type": "TextBody",
            "text": "⏰ Note: After clicking 'Confirm Order', we will send you payment options. Payment must be completed within 5 minutes, or the booking will be released."
          },
          {
            "type": "Footer",
            "label": "Confirm Order",
            "on-click-action": {
              "name": "data_exchange",
              "payload": {
                "sport": "${data.sport}",
                "date": "${data.date}",
                "duration": "${data.duration}",
                "time_slot": "${data.time_slot}",
                "total_amount": "${data.total_amount}",
                "discount_info": "${data.discount_info}",
                "name": "${data.name}",
                "phone": "${data.phone}",
                "email": "${data.email}",
                "agree_cancellation": "${form.agree_cancellation}",
                "agree_terms": "${form.agree_terms}",
                "order_confirmed": true,
                "razorpay_mid": "acc_PX637rs8HXQBWa",
                "whatsapp_business_id": "1750678955481520"
              }
            }
          }
        ]
      }
    }
  ]
}

module.exports = WHATSAPP_FLOW;