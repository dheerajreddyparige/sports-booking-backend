/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const flowDbUtils = require('./flowDbUtils');
const connectToDatabase = require('./connect-to-database');
const WHATSAPP_FLOW = require('../config/whatsappFlow');

// Helper functions for date formatting
function getFormattedDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

function getFormattedDateTitle(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Screen responses based on WhatsApp Flow configuration
const SCREEN_RESPONSES = {
  BOOKING: {
    screen: "BOOKING",
    data: {
      sports: [],
      durations: WHATSAPP_FLOW.screens.find(s => s.id === "BOOKING").data.durations.__example__, // Fallback to example if needed
      time_slots: [],
    },
  },
  SUMMARY: {
    screen: "SUMMARY",
    data: {
      total_amount: WHATSAPP_FLOW.screens.find(s => s.id === "SUMMARY").data.total_amount,
      discount_info: WHATSAPP_FLOW.screens.find(s => s.id === "SUMMARY").data.discount_info,
      rates: WHATSAPP_FLOW.screens.find(s => s.id === "SUMMARY").data.rates,
      cancellation_policy: WHATSAPP_FLOW.screens.find(s => s.id === "SUMMARY").data.cancellation_policy,
      terms: WHATSAPP_FLOW.screens.find(s => s.id === "SUMMARY").data.terms,
      sport: "",
      date: "",
      duration: "",
      time_slots: "",
      name: "",
      phone: "",
      email: "",
    },
  },
  SUCCESS: {
    screen: "SUCCESS",
    data: {
      invoice_url: WHATSAPP_FLOW.screens.find(s => s.id === "SUCCESS").data.invoice_url,
      extension_message_response: {
        params: {
          flow_token: "REPLACE_FLOW_TOKEN",
          booking_id: "",
        },
      },
    },
  },
};

const getNextScreen = async (decryptedBody) => {
  const { screen, data, version, action, flow_token } = decryptedBody;
  
  await connectToDatabase();
  
  if (action === "ping") {
    return { data: { status: "active" } };
  }

  if (data?.error) {
    console.warn("Received client error:", data);
    return { data: { acknowledged: true } };
  }

  if (action === "INIT") {
    try {
      const sportsFacilities = await flowDbUtils.getSportsFacilities();
      const availableDates = await flowDbUtils.getAvailableDates();
      await flowDbUtils.saveFlowState(flow_token, "BOOKING", {});
      
      // Format sports for RadioButtonsGroup
      const formattedSports = sportsFacilities.map(sport => ({
        id: sport.id,
        title: sport.title
      }));
      
      return {
        ...SCREEN_RESPONSES.BOOKING,
        data: {
          ...SCREEN_RESPONSES.BOOKING.data,
          sports: formattedSports,
          time_slots: sportsFacilities.length > 0 ? 
            [{id: 'default1', title: 'Morning Slot'}, {id: 'default2', title: 'Evening Slot'}] : [],
        },
      };
    } catch (error) {
      console.error("Error initializing flow:", error);
      return { ...SCREEN_RESPONSES.BOOKING };
    }
  }

  if (action === "data_exchange") {
    switch (screen) {
      case "BOOKING":
        try {
          if (data.sport || data.date || data.duration || data.time_slots) {
            await flowDbUtils.saveFlowState(flow_token, "BOOKING", data);
          }
          
          let availableTimeSlots = [];
          if (data.sport && data.date && data.duration) {
            availableTimeSlots = await flowDbUtils.getAvailableTimeSlots(data.sport, data.date, data.duration);
            availableTimeSlots = availableTimeSlots.map(slot => ({
              id: `${slot.id}-${(parseInt(slot.id.split(':')[0]) + parseInt(data.duration)).toString().padStart(2, '0')}:${slot.id.split(':')[1]}`,
              title: `${slot.id} - ${(parseInt(slot.id.split(':')[0]) + parseInt(data.duration)).toString().padStart(2, '0')}:${slot.id.split(':')[1]}`,
              enabled: slot.enabled
            }));
          }
          
          if (data.sport && data.date && data.duration && data.time_slots) {
            const sportType = data.sport;
            const durationHours = parseFloat(data.duration);
            const isWeekend = new Date(data.date).getDay() === 0 || new Date(data.date).getDay() === 6;
            const timeSlot = data.time_slots;
            const isEvening = parseInt(timeSlot.split('-')[0].split(':')[0]) >= 17;
            
            let hourlyRate = 0;
            if (sportType === 'badminton') {
              hourlyRate = isWeekend ? (isEvening ? 450 : 400) : (isEvening ? 350 : 300);
            } else if (sportType === 'cricket') {
              hourlyRate = isWeekend ? (isEvening ? 2200 : 2000) : (isEvening ? 1800 : 1500);
            } else if (sportType === 'pickleball') {
              hourlyRate = isWeekend ? (isEvening ? 350 : 300) : (isEvening ? 250 : 200);
            }
            
            let discountPercent = 0;
            let discountInfo = '';
            if (durationHours >= 2 && durationHours < 3) {
              discountPercent = 5;
              discountInfo = '5% off for 2-hour booking';
            } else if (durationHours >= 3 && durationHours < 4) {
              discountPercent = 10;
              discountInfo = '10% off for 3-hour booking';
            } else if (durationHours >= 4) {
              discountPercent = 15;
              discountInfo = '15% off for 4-hour booking';
            }
            
            const totalBeforeDiscount = hourlyRate * durationHours;
            const discountAmount = totalBeforeDiscount * (discountPercent / 100);
            const totalAmount = Math.round(totalBeforeDiscount - discountAmount);
            
            const sportName = SCREEN_RESPONSES.BOOKING.data.sports.find(
              (sport) => sport.id === data.sport
            )?.title || data.sport;
            
            return {
              screen: "SUMMARY",
              data: {
                ...SCREEN_RESPONSES.SUMMARY.data,
                total_amount: totalAmount,
                discount_info: discountInfo,
                sport: sportName,
                date: data.date,
                duration: data.duration,
                time_slots: data.time_slots,
              },
            };
          }
          
          const sports = await flowDbUtils.getSportsFacilities();
          const formattedSports = sports.map(sport => ({
            id: sport.id,
            title: sport.title
          }));
          
          return {
            ...SCREEN_RESPONSES.BOOKING,
            data: {
              ...SCREEN_RESPONSES.BOOKING.data,
              sports: formattedSports,
              time_slots: availableTimeSlots.length > 0 ? availableTimeSlots : 
                [{id: 'default1', title: 'Morning Slot'}, {id: 'default2', title: 'Evening Slot'}],
              ...data,
            },
          };
        } catch (error) {
          console.error("Error processing BOOKING screen:", error);
          return {
            ...SCREEN_RESPONSES.BOOKING,
            data: { ...SCREEN_RESPONSES.BOOKING.data, ...data },
          };
        }

      case "SUMMARY":
        try {
          await flowDbUtils.saveFlowState(flow_token, "SUMMARY", data);
          
          const bookingDetails = {
            sport: data.sport,
            date: data.date,
            duration: data.duration,
            time_slots: data.time_slots,
            total_amount: data.total_amount,
            name: data.name,
            phone: data.phone,
            email: data.email || '',
            agree_cancellation: data.agree_cancellation,
            agree_terms: data.agree_terms
          };
          
          const invoiceUrl = `https://example.com/invoice/${flow_token}`;
          
          return {
            screen: "SUCCESS",
            data: {
              invoice_url: invoiceUrl,
              extension_message_response: {
                params: {
                  flow_token,
                  booking_details: JSON.stringify(bookingDetails)
                },
              },
            },
          };
        } catch (error) {
          console.error("Error processing SUMMARY screen:", error);
          return {
            screen: "SUCCESS",
            data: {
              invoice_url: "https://example.com/invoice/error",
              extension_message_response: {
                params: {
                  flow_token,
                  error: "Failed to process booking details, but payment was successful."
                },
              },
            },
          };
        }

      default:
        break;
    }
  }

  console.error("Unhandled request body:", decryptedBody);
  throw new Error(
    "Unhandled endpoint request. Make sure you handle the request action & screen logged above."
  );
};

module.exports = {
  getNextScreen
};
