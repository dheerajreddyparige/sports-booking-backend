/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const flowDbUtils = require('./flowDbUtils');
const connectToDatabase = require('./connect-to-database');
const WHATSAPP_FLOW = require('../config/whatsappFlow');

// Screen responses based on WhatsApp Flow configuration
const SCREEN_RESPONSES = {
  BOOKING: {
    screen: "BOOKING",
    data: {
      sports: [],
      durations: [],
      time_slots: [], // Ensure this is initialized as an empty array
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
  
  console.log('🔍 getNextScreen called with:', {
    screen,
    action,
    flowToken: flow_token,
    version,
    dataKeys: data ? Object.keys(data) : 'No data'
  });
  
  await connectToDatabase();
  
  if (action === "ping") {
    console.log('📡 Ping request received, responding with active status');
    return { data: { status: "active" } };
  }

  if (data?.error) {
    console.warn("⚠️ Received client error:", data);
    return { data: { acknowledged: true } };
  }

  if (action === "INIT") {
    console.log('🚀 Initializing flow with token:', flow_token);
    try {
      console.log('📋 Fetching sports facilities...');
      const sportsFacilities = await flowDbUtils.getSportsFacilities();
      console.log(`✅ Found ${sportsFacilities.length} sports facilities`);
      
      // Format sports for RadioButtonsGroup
      const formattedSports = sportsFacilities.map(sport => ({
        id: sport.id,
        title: sport.title,
        image: sport.id === 'badminton' ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' : 
               sport.id === 'cricket' ? 'https://www.bing.com/images/search?q=cricket%20photo&FORM=IQFRBA&id=4EB3BB378E53EAA46D569563A3A6F83E3E801B15' : 
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        description: `${sport.title} court`,
        metadata:'90'
        
      }));
  
      // Define durations
      const formattedDurations = [
        { id: "1", title: "1 Hour" },
        {"id": "1", "title": "1 Hour", "description":"","metadata": "" },
        {"id": "1.5", "title": "1.5 Hours", "description":"","metadata": "" },
        {"id": "2", "title": "2 Hours", "description":"","metadata": "5% off" },
        {"id": "2.5", "title": "2.5 Hours", "description":"","metadata": "5% off" },
        {"id": "3", "title": "3 Hours", "description":"","metadata": "10% off" },
        {"id": "3.5", "title": "3.5 Hours", "description":"","metadata": "10% off" },
        {"id": "4", "title": "4 Hours", "description":"","metadata": "15% off" }
      ];
  
    
      // Define default time slots (to avoid ChipsSelector error)
      const formattedTimeSlots = [
        { id: "09:00-10:00", title: "9:00 AM - 10:00 AM" },
        { id: "17:00-18:00", title: "5:00 PM - 6:00 PM" }
      ];
  
      console.log('📅 Fetching available dates...');
      const availableDates = await flowDbUtils.getAvailableDates();
      console.log(`✅ Found ${availableDates.length} available dates`);
      
      console.log('💾 Saving initial flow state...');
      await flowDbUtils.saveFlowState(flow_token, "BOOKING", {
        is_date_enabled: false,
        is_duration_enabled: false,
        is_time_slots_enabled: false,
        is_footer_enabled: false
      });
      console.log('✅ Initial flow state saved');
      
      return {
        ...SCREEN_RESPONSES.BOOKING,
        data: {
          ...SCREEN_RESPONSES.BOOKING.data,
          sports: formattedSports,
          durations: formattedDurations,
          time_slots: formattedTimeSlots,
          is_date_enabled: false,
          is_duration_enabled: false,
          is_time_slots_enabled: false,
          is_footer_enabled: false
        },
      };
    } catch (error) {
      console.error("❌ Error initializing flow:", error);
      return { ...SCREEN_RESPONSES.BOOKING };
    }
  }

  // In the data_exchange handler for the BOOKING screen
  if (action === "data_exchange") {
    console.log('🔄 Data exchange for screen:', screen);
    switch (screen) {
      case "BOOKING":
        try {
          // Get current state
          console.log('📋 Fetching current flow state...');
          const currentState = await flowDbUtils.getFlowState(flow_token) || {};
          const currentData = currentState || {};
          console.log('📋 Current flow state:', JSON.stringify(currentData, null, 2));
          
          // Log the received data for debugging
          console.log("Received data_exchange with data:", JSON.stringify(decryptedBody.data));
          
          // Merge new data with existing data
          const mergedData = { ...currentData, ...data };
          console.log('🔄 Merged data:', JSON.stringify(mergedData, null, 2));
          
          // Update visibility flags based on client payload or current selections
          const visibilityFlags = {
            is_date_enabled: data.is_date_enabled !== undefined ? data.is_date_enabled : Boolean(mergedData.sport),
            is_duration_enabled: data.is_duration_enabled !== undefined ? data.is_duration_enabled : Boolean(mergedData.sport && mergedData.date),
            is_time_slots_enabled: data.is_time_slots_enabled !== undefined ? data.is_time_slots_enabled : Boolean(mergedData.sport && mergedData.date && mergedData.duration)
          };

          
          // Enable footer when all required fields are filled AND a time slot is selected 
          visibilityFlags.is_footer_enabled = data.is_footer_enabled === true || 
            (Boolean(mergedData.sport && mergedData.date && mergedData.duration && mergedData.time_slot) );
          
         /* console.log('🔍 Time slot selected:', hasTimeSlotSelected);*/
          
          console.log("Current data:", {
            sport: mergedData.sport,
            date: mergedData.date,
            duration: mergedData.duration,
            time_slots: mergedData.time_slots
          });
          console.log("Visibility flags:", visibilityFlags);
          
          // Save the updated state with visibility flags
          console.log('💾 Saving updated flow state...');
          await flowDbUtils.saveFlowState(flow_token, "BOOKING", {
            ...mergedData,
            ...visibilityFlags
          });
          console.log('✅ Flow state updated');
          
          // Get sports list
          const sportsFacilities = await flowDbUtils.getSportsFacilities();
          const formattedSports = sportsFacilities.map(sport => ({
            id: sport.id,
            title: sport.title,
            image: sport.id === 'badminton' ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' : 
                   sport.id === 'cricket' ? 'https://www.bing.com/images/search?q=cricket%20photo&FORM=IQFRBA&id=4EB3BB378E53EAA46D569563A3A6F83E3E801B15' : 
                  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
            description: `${sport.title} court`,
            metadata:'90'
            
          }));
          const formattedDurations = [
            {"id": "1", "title": "1 Hour", "description":"","metadata": "" },
            {"id": "1.5", "title": "1.5 Hours", "description":"","metadata": "" },
            {"id": "2", "title": "2 Hours", "description":"","metadata": "5% off" },
            {"id": "2.5", "title": "2.5 Hours", "description":"","metadata": "5% off" },
            {"id": "3", "title": "3 Hours", "description":"","metadata": "10% off" },
            {"id": "3.5", "title": "3.5 Hours", "description":"","metadata": "10% off" },
            {"id": "4", "title": "4 Hours", "description":"","metadata": "15% off" }
          ];
           let timeSlots = [
            { id: "09:00-10:00", title: "9:00 AM - 10:00 AM","enabled": false },
            { id: "17:00-18:00", title: "5:00 PM - 6:00 PM" }
          ];
          
          if (mergedData.sport && mergedData.date && mergedData.duration && mergedData.time_of_day) {
            console.log('🕒 Fetching time slots with params:', {
              sport: mergedData.sport,
              date: mergedData.date,
              duration: mergedData.duration,
              timeOfDay: mergedData.time_of_day
            });
            
            try {
              // Get all available slots
              const allSlots = await flowDbUtils.getAvailableTimeSlots(
                mergedData.sport,
                mergedData.date,
                mergedData.duration
              );
              console.log(`✅ Filtered ${timeSlots.length} time slots for ${mergedData.time_of_day}`);
            } catch (error) {
              console.error('❌ Error fetching time slots:', error);
            }
          }
          
          return {
            ...SCREEN_RESPONSES.BOOKING,
            data: {
              ...SCREEN_RESPONSES.BOOKING.data,
              sports: formattedSports,
              durations: formattedDurations,
              time_slots: timeSlots, 
              sport: mergedData.sport || "",
              date: mergedData.date || "",
              duration: mergedData.duration || "",
              time_slot: mergedData.time_slot || "", 
              ...visibilityFlags
            },
          };
        } catch (error) {
          console.error("❌ Error processing BOOKING data exchange:", error);
          return { ...SCREEN_RESPONSES.BOOKING };
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
  
  // Add this near the top of your getNextScreen function
  if (action === "debug") {
  try {
    const currentState = await flowDbUtils.getFlowState(flow_token) || {};
    return {
      data: {
        current_state: currentState,
        message: "Debug information retrieved successfully"
      }
    };
  } catch (error) {
    console.error("Error retrieving debug information:", error);
    return {
      data: {
        error: "Failed to retrieve debug information",
        message: error.message
      }
    };
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


