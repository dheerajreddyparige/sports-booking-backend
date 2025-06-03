/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const flowDbUtils = require('./flowDbUtils');
const connectToDatabase = require('../utils/mysql-connection.js');
const WHATSAPP_FLOW = require('../config/whatsappFlow');

// Add debug logging
console.log('🔍 Loading flow.js module');

// Screen responses based on WhatsApp Flow configuration
const SCREEN_RESPONSES = {
  BOOKING: {
    screen: "BOOKING",
    data: {
      sports: [],
      durations: [],
      time_slots: [], 
    },
  },
  DETAILS: {
    screen: "DETAILS",
    data: {
      sport: "",
      date: "",
      duration: "",
      time_slot: "",
      total_amount: "",
      discount_info: "",
      name: "",
      phone: "",
      email: "",
      is_existing_customer: false,
      is_name_enabled: false,
      is_phone_enabled: false,
      is_email_enabled: false,
    },
  },
  SUMMARY: {
    screen: "SUMMARY",
    data: {
      total_amount: "" ,
      discount_info: "",
      terms: "",
      sport: "",
      date: "",
      duration: "",
      time_slot: "",
      name: "",
      phone: "",
      email: "",
      cancellation_policy: "",
    },
  },
  SUCCESS: {
    screen: "SUCCESS",
    data: {
      invoice_url: "",
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
    return {version, data: { status: "active" } };
  }

  if (data?.error) {
    console.warn("⚠️ Received client error:", data);
    return { data: { acknowledged: true } };
  }

  if (action === "back") {
    console.log('⬅️ Back navigation detected from screen:', screen);
    
    try {
      // Get current flow state
      const currentState = await flowDbUtils.getFlowState(flow_token) || {};
      console.log('📋 Current flow state:', currentState);
      
      // Determine previous screen based on navigation flow
      let previousScreen;
      if (screen === "DETAILS") {
        previousScreen = "BOOKING";
      } else if (screen === "SUMMARY") {
        previousScreen = "DETAILS";
      } else {
        // Default to BOOKING if unknown screen
        previousScreen = "BOOKING";
      }
      
      console.log(`⬅️ Navigating back from ${screen} to ${previousScreen}`);
      
      // Get the appropriate screen response data
      let responseData;
      
      switch (previousScreen) {
        case "BOOKING":
          // Prepare sports list
          const sportsFacilities = await flowDbUtils.getSportsFacilities();
          const formattedSports = await Promise.all(sportsFacilities.map(async sport => {
            const sportConfig = await flowDbUtils.getSportConfig(sport.id);
            let pricingInfo = `₹${sportConfig.baseRate}/hr`;
            
            if (sportConfig.pricingRates) {
              const weekdayMorning = sportConfig.pricingRates.weekday?.morning || sportConfig.baseRate;
              const weekendEvening = sportConfig.pricingRates.weekend?.evening || Math.round(sportConfig.baseRate * 1.5);
              
              if (weekdayMorning !== weekendEvening) {
                pricingInfo = `₹${weekdayMorning}-${weekendEvening}/hr`;
              }
            }
            
            return {
              id: sport.id,
              title: sport.title,
              image: sport.imageUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
              description: sport.description || `${sport.title} court`,
              metadata: pricingInfo
            };
          }));
          
          // Get sport configuration for durations
          const sportConfig = await flowDbUtils.getSportConfig(currentState.sport || sportsFacilities[0]?.id || 'badminton');
          
          // Define durations
          const formattedDurations = [
            {"id": "1", "title": "1 Hour", "description":"","metadata": "" },
            {"id": "1.5", "title": "1.5 Hours", "description":"","metadata": "" },
            {"id": "2", "title": "2 Hours", "description":"","metadata": `${sportConfig.discounts.twoHour}% off` },
            {"id": "2.5", "title": "2.5 Hours", "description":"","metadata": `${sportConfig.discounts.twoHour}% off` },
            {"id": "3", "title": "3 Hours", "description":"","metadata": `${sportConfig.discounts.threeHour}% off` },
            {"id": "3.5", "title": "3.5 Hours", "description":"","metadata": `${sportConfig.discounts.threeHour}% off` },
            {"id": "4", "title": "4 Hours", "description":"","metadata": `${sportConfig.discounts.fourHour}% off` }
          ];
          
          // Get time slots if all required fields are present
          let formattedTimeSlots = [
            { id: "09:00", title: "9:00 AM - 10:00 AM" },
            { id: "17:00", title: "5:00 PM - 6:00 PM" }
          ];
          
          if (currentState.sport && currentState.date && currentState.duration) {
            try {
              const slotsResult = await flowDbUtils.getAvailableTimeSlots(
                currentState.sport,
                currentState.date,
                currentState.duration
              );
              
              if (slotsResult.slots && slotsResult.slots.length > 0) {
                formattedTimeSlots = slotsResult.slots;
              }
            } catch (error) {
              console.error('❌ Error fetching time slots during back navigation:', error);
            }
          }
          
          // Update flow state with previous screen
          await flowDbUtils.saveFlowState(flow_token, "BOOKING", {
            ...currentState,
            screen: "BOOKING"
          });
          
          responseData = {
            sports: formattedSports,
            durations: formattedDurations,
            time_slots: formattedTimeSlots,
            sport: currentState.sport || "",
            date: currentState.date || "",
            duration: currentState.duration || "",
            time_slot: currentState.time_slot || "", 
            is_date_enabled: Boolean(currentState.sport),
            is_duration_enabled: Boolean(currentState.sport && currentState.date),
            is_time_slots_enabled: Boolean(currentState.sport && currentState.date && currentState.duration),
            is_footer_enabled: Boolean(currentState.sport && currentState.date && currentState.duration && currentState.time_slot)
          };
          break;
          
        case "DETAILS":
          // Update flow state with previous screen
          await flowDbUtils.saveFlowState(flow_token, "DETAILS", {
            ...currentState,
            screen: "DETAILS"
          });
          
          responseData = {
            ...SCREEN_RESPONSES.DETAILS.data,
            sport: currentState.sport || "",
            date: currentState.date || "",
            duration: currentState.duration || "",
            time_slot: currentState.time_slot || "",
            total_amount: currentState.total_amount || "",
            discount_info: currentState.discount_info || "",
            name: currentState.name || "",
            phone: currentState.phone || "",
            email: currentState.email || "",
            is_existing_customer: Boolean(currentState.is_existing_customer),
            show_new_customer_message: !currentState.is_existing_customer,
            show_existing_customer_message: Boolean(currentState.is_existing_customer),
            is_name_filled: Boolean(currentState.name && currentState.name.length > 0),
            is_phone_filled: Boolean(currentState.phone && currentState.phone.length > 0)
          };
          break;
          
        default:
          // Default to BOOKING screen
          responseData = { ...SCREEN_RESPONSES.BOOKING.data };
          break;
      }
      
      return {
        version: version || "3.0",
        screen: previousScreen,
        data: responseData
      };
    } catch (error) {
      console.error('❌ Error handling back navigation:', error);
      // Default to BOOKING screen on error
      return { 
        version: version || "3.0",
        screen: "BOOKING",
        data: { ...SCREEN_RESPONSES.BOOKING.data }
      };
    }
  }

  if (action === "INIT") {
    console.log('🚀 Initializing flow with token:', flow_token);
    try {
      console.log('📋 Fetching sports facilities...');
      const sportsFacilities = await flowDbUtils.getSportsFacilities();
      console.log(`✅ Found ${sportsFacilities.length} sports facilities`);
      
      // Store the phone number from the data if available
      let phoneNumber = null;
      if (data && data.phone_number) {
        phoneNumber = data.phone_number;
        console.log('📱 Phone number found in data payload:', phoneNumber);
      } else {
        console.log('⚠️ No phone number in data payload, using default flow');
      }
      
      // Format sports for Dropdown with dynamic data
      const formattedSports = await Promise.all(sportsFacilities.map(async sport => {
        // Get sport configuration for pricing info
        const sportConfig = await flowDbUtils.getSportConfig(sport.id);
        const baseRate = sportConfig.baseRate || 400;
        
        return {
          id: sport.id,
          title: sport.title,
          image: sport.imageUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          description: sport.description || `${sport.title} court`,
          metadata: `₹${baseRate}/hr`
        };
      }));
  
      // Get sport configuration for the first sport to set up durations with dynamic discounts
      const defaultSportConfig = await flowDbUtils.getSportConfig(sportsFacilities[0]?.id || 'badminton');
      
      // Define durations with dynamic discount information
      const formattedDurations = [
        {"id": "1", "title": "1 Hour", "description":"","metadata": "" },
        {"id": "1.5", "title": "1.5 Hours", "description":"","metadata": "" },
        {"id": "2", "title": "2 Hours", "description":"","metadata": `${defaultSportConfig.discounts.twoHour}% off` },
        {"id": "2.5", "title": "2.5 Hours", "description":"","metadata": `${defaultSportConfig.discounts.twoHour}% off` },
        {"id": "3", "title": "3 Hours", "description":"","metadata": `${defaultSportConfig.discounts.threeHour}% off` },
        {"id": "3.5", "title": "3.5 Hours", "description":"","metadata": `${defaultSportConfig.discounts.threeHour}% off` },
        {"id": "4", "title": "4 Hours", "description":"","metadata": `${defaultSportConfig.discounts.fourHour}% off` }
      ];
  
      // Define default time slots (to avoid Dropdown error)
      const formattedTimeSlots = [
        { id: "09:00-10:00", title: "9:00 AM - 10:00 AM" },
        { id: "17:00-18:00", title: "5:00 PM - 6:00 PM" }
      ];
  
      console.log('📅 Fetching available dates...');
      const availableDates = await flowDbUtils.getAvailableDates();
      console.log(`✅ Found ${availableDates.length} available dates`);
      
      // Generate dynamic date range for DatePicker (today to next 7 days)
      const today = new Date();
      const todayFormatted = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const maxDate = new Date();
      maxDate.setDate(today.getDate() + 7); // 7 days from today
      const maxDateFormatted = maxDate.toISOString().split('T')[0];
      
      console.log(`📅 Setting date range: ${todayFormatted} to ${maxDateFormatted}`);
      
      console.log('💾 Saving initial flow state...');
      const initialState = {
        screen: "BOOKING",
        phoneNumber: phoneNumber,
        sport: "",
        date: "",
        duration: "",
        time_slot: "",
        is_date_enabled: false,
        is_duration_enabled: false,
        is_time_slots_enabled: false,
        is_footer_enabled: false,
        min_date: todayFormatted,
        max_date: maxDateFormatted
      };
      
      await flowDbUtils.saveFlowState(flow_token, "BOOKING", initialState);
      console.log('✅ Initial flow state saved:', initialState);
      
      return {
        version: version || "3.0", // Ensure version is sent back
        screen: "BOOKING",
        data: {
          sports: formattedSports,
          durations: formattedDurations,
          time_slots: formattedTimeSlots,
          sport: "",
          date: "",
          duration: "",
          time_slot: "",
          is_date_enabled: false,
          is_duration_enabled: false,
          is_time_slots_enabled: false,
          is_footer_enabled: false,
          min_date: todayFormatted,
          max_date: maxDateFormatted
        },
      };
    } catch (error) {
      console.error("❌ Error initializing flow:", error);
      return { 
        version: version || "3.0",
        screen: "BOOKING",
        data: {
          sports: [],
          durations: [],
          time_slots: [],
          sport: "",
          date: "",
          duration: "",
          time_slot: "",
          is_date_enabled: false,
          is_duration_enabled: false,
          is_time_slots_enabled: false,
          is_footer_enabled: false,
          error_message: "Failed to initialize. Please try again."
        } 
      };
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
          console.log('📋 Current flow state:', JSON.stringify(currentState, null, 2));
          
          // Log the received data for debugging
          console.log("Received data_exchange with data:", JSON.stringify(data, null, 2));
          
          // Merge new data with existing data - prioritize new data
          const mergedData = { ...currentState, ...data };
          console.log('🔄 Merged data:', JSON.stringify(mergedData, null, 2));
          
          // Update visibility flags based on client payload or current selections
          const visibilityFlags = {
            is_date_enabled: data.is_date_enabled !== undefined ? data.is_date_enabled : Boolean(mergedData.sport),
            is_duration_enabled: data.is_duration_enabled !== undefined ? data.is_duration_enabled : Boolean(mergedData.sport && mergedData.date),
            is_time_slots_enabled: data.is_time_slots_enabled !== undefined ? data.is_time_slots_enabled : Boolean(mergedData.sport && mergedData.date && mergedData.duration)
          };
          
          // Enable footer when all required fields are filled AND a time slot is selected 
          visibilityFlags.is_footer_enabled = data.is_footer_enabled === true || 
            (Boolean(mergedData.sport && mergedData.date && mergedData.duration && mergedData.time_slot));
          
          console.log("Current data:", {
            sport: mergedData.sport,
            date: mergedData.date,
            duration: mergedData.duration,
            time_slot: mergedData.time_slot
          });
          console.log("Visibility flags:", visibilityFlags);
          
          // Ensure consistent property names for saving to flow state
          const stateData = {
            ...mergedData,
            ...visibilityFlags
          };
          
          // Remove any duplicate fields that might cause confusion
          delete stateData.timeSlot; // Use only time_slot
          delete stateData.phoneNumber; // Use only phone
          
          // Save the updated state with visibility flags
          console.log('💾 Saving updated flow state...');
          await flowDbUtils.saveFlowState(flow_token, "BOOKING", stateData);
          console.log('✅ Flow state updated');
          
          // Check if this is a footer click (transition to next screen)
          // If the footer is enabled and the request came from a footer click
          // (indicated by all required fields being present), transition to DETAILS screen
          if (data.is_footer_enabled === true ) {
            console.log('🔄 Footer clicked or all fields filled, transitioning to DETAILS screen');
            console.log('📋 Data being passed to DETAILS screen:', {
              sport: mergedData.sport,
              date: mergedData.date,
              duration: mergedData.duration,
              time_slot: mergedData.time_slot
            });
            
            // Calculate total amount using the new calculatePrice helper function
            console.log('💰 Calculating price dynamically based on sport and duration');
            const priceDetails = flowDbUtils.calculatePriceHelper(mergedData.sport, parseFloat(mergedData.duration));
            
            // Extract price details
            const { originalAmount, finalAmount, discountPercent, discountInfo } = priceDetails;
            console.log('💰 Price details:', { originalAmount, finalAmount, discountPercent, discountInfo });
            
            // Get customer phone number from flow token (assuming it's stored in flow state)
            const flowState = await flowDbUtils.getFlowState(flow_token);
            const phoneNumber = flowState?.phoneNumber || '';
            
            // Check if customer exists
            let existingCustomer = null;
            if (phoneNumber) {
              try {
                existingCustomer = await flowDbUtils.getCustomerByPhone(phoneNumber);
                console.log('👤 Customer lookup result:', existingCustomer ? 'Found existing customer' : 'New customer');
              } catch (error) {
                console.error('❌ Error looking up customer:', error);
              }
            }
            
            console.log('👤 Customer details being set:', {
              isExisting: !!existingCustomer,
              name: existingCustomer?.name || "",
              phone: existingCustomer?.phoneNumber || phoneNumber || "",
              email: existingCustomer?.email || ""
            });
            
            // Set visibility flags for UI
            const isExistingCustomer = !!existingCustomer;
            
            return {
              screen: "DETAILS", // Change screen to DETAILS for customer information
              data: {
                ...SCREEN_RESPONSES.DETAILS.data,
                sport: mergedData.sport || "",
                date: mergedData.date || "",
                duration: mergedData.duration || "",
                time_slot: mergedData.time_slot,
                discount_info: discountInfo || "",
                total_amount: finalAmount.toString(),
                original_amount: originalAmount.toString(),
                // Pre-fill customer data if existing customer
                name: existingCustomer?.name || "",
                phone: existingCustomer?.phoneNumber || phoneNumber || "",
                email: existingCustomer?.email || "",
                is_existing_customer: isExistingCustomer,
                show_new_customer_message: !isExistingCustomer,
                show_existing_customer_message: isExistingCustomer,
                // Pass date range
                min_date: mergedData.min_date,
                max_date: mergedData.max_date
              },
            };
          }
          
          // If not transitioning to SUMMARY, return updated BOOKING screen
          // Get sports list
          const sportsFacilities = await flowDbUtils.getSportsFacilities();
          // Format sports with dynamic data
          const formattedSports = await Promise.all(sportsFacilities.map(async sport => {
            // Get sport configuration to access pricing rates
            const sportConfig = await flowDbUtils.getSportConfig(sport.id);
            
            // Create pricing info string showing the range of rates
            let pricingInfo = `₹${sportConfig.baseRate}/hr`;
            
            // If pricing rates are configured, show the range
            if (sportConfig.pricingRates) {
              const weekdayMorning = sportConfig.pricingRates.weekday?.morning || sportConfig.baseRate;
              const weekendEvening = sportConfig.pricingRates.weekend?.evening || Math.round(sportConfig.baseRate * 1.5);
              
              // Show price range if they differ
              if (weekdayMorning !== weekendEvening) {
                pricingInfo = `₹${weekdayMorning}-${weekendEvening}/hr`;
              }
            }
            
            return {
              id: sport.id,
              title: sport.title,
              image: sport.imageUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
              description: sport.description || `${sport.title} court`,
              metadata: pricingInfo
            };
          }));
          
          // Generate time slots if duration is selected, using new generateTimeSlotsHelper function
          let formattedTimeSlots = [
            { id: "09:00-10:00", title: "9:00 AM - 10:00 AM" },
            { id: "17:00-18:00", title: "5:00 PM - 6:00 PM" }
          ];
          
          if (mergedData.sport && mergedData.date && mergedData.duration) {
            try {
              formattedTimeSlots = flowDbUtils.generateTimeSlotsHelper(
                mergedData.sport,
                mergedData.date,
                parseFloat(mergedData.duration)
              );
              console.log(`⏰ Generated ${formattedTimeSlots.length} time slots for ${mergedData.duration} hour duration`);
            } catch (error) {
              console.error('❌ Error generating time slots:', error);
            }
          }
          
          // Get sport configuration for durations with discounts
          const sportConfig = await flowDbUtils.getSportConfig(mergedData.sport || sportsFacilities[0]?.id || 'badminton');
          
          // Define durations with dynamic discount information
          const formattedDurations = [
            {"id": "1", "title": "1 Hour", "description":"","metadata": "" },
            {"id": "1.5", "title": "1.5 Hours", "description":"","metadata": "" },
            {"id": "2", "title": "2 Hours", "description":"","metadata": `${sportConfig.discounts.twoHour}% off` },
            {"id": "2.5", "title": "2.5 Hours", "description":"","metadata": `${sportConfig.discounts.twoHour}% off` },
            {"id": "3", "title": "3 Hours", "description":"","metadata": `${sportConfig.discounts.threeHour}% off` },
            {"id": "3.5", "title": "3.5 Hours", "description":"","metadata": `${sportConfig.discounts.threeHour}% off` },
            {"id": "4", "title": "4 Hours", "description":"","metadata": `${sportConfig.discounts.fourHour}% off` }
          ];
           
          return {
            screen: "BOOKING",
            data: {
              sports: formattedSports,
              durations: formattedDurations,
              time_slots: formattedTimeSlots,
              sport: mergedData.sport || "",
              date: mergedData.date || "",
              duration: mergedData.duration || "",
              time_slot: mergedData.time_slot,
              is_date_enabled: visibilityFlags.is_date_enabled,
              is_duration_enabled: visibilityFlags.is_duration_enabled,
              is_time_slots_enabled: visibilityFlags.is_time_slots_enabled,
              is_footer_enabled: visibilityFlags.is_footer_enabled
            },
          };
        } catch (error) {
          console.error("❌ Error processing BOOKING data exchange:", error);
          return { ...SCREEN_RESPONSES.BOOKING };
        }
        
      case "DETAILS":
        try {
          // Get current state
          console.log('📋 Fetching current flow state for DETAILS screen...');
          const currentState = await flowDbUtils.getFlowState(flow_token) || {};
          console.log('📋 Current flow state:', JSON.stringify(currentState, null, 2));
          
          // Merge new data with existing data - prioritize new data
          const mergedData = { ...currentState, ...data };
          console.log('🔄 Merged data:', JSON.stringify(mergedData, null, 2));
          
          // Check if this includes update_customer_fields flag, indicating that customer details should be saved
          if (data.update_customer_fields) {
            console.log('👤 Updating customer details with form data:', {
              name: data.name,
              phone: data.phone,
              email: data.email
            });
            
            // Create or update customer
            try {
              // If phone is provided, save customer details
              if (data.phone) {
                await flowDbUtils.createOrUpdateCustomer({
                  name: data.name,
                  phone: data.phone,
                  email: data.email
                });
                console.log('✅ Customer details saved/updated');
              }
            } catch (error) {
              console.error('❌ Error saving customer details:', error);
            }
            
            // Transition to SUMMARY screen
            console.log('🔄 Customer details saved, transitioning to SUMMARY screen');
            
            // Update merged data with customer info
            mergedData.name = data.name;
            mergedData.phone = data.phone;
            mergedData.email = data.email;
            
            // Preserve the duration and time_slot from the previous screen if they exist
            // When retrieving from flow state, the properties are camelCase (timeSlot) but in our application logic we use snake_case (time_slot)
            const duration = mergedData.duration || currentState.duration || "1";
            const timeSlot = mergedData.time_slot || currentState.time_slot || "";
            
            // Calculate price details
            console.log('💰 Calculating price details with duration:', duration);
            const priceDetails = flowDbUtils.calculatePriceHelper(mergedData.sport, parseFloat(duration));
            
            // Ensure amounts are stored as strings
            mergedData.total_amount = priceDetails.finalAmount.toString();
            mergedData.original_amount = priceDetails.originalAmount.toString();
            mergedData.discount_info = priceDetails.discountInfo;
            mergedData.duration = duration; // Ensure duration is preserved
            mergedData.time_slot = timeSlot; // Ensure time_slot is preserved
            
            // Format details for display in SUMMARY screen
            const bookingDetails = `📅 ${mergedData.sport} - ${mergedData.date}\n⏰ ${timeSlot}\n⌛ Duration: ${duration} hour(s)`;
            const customerDetails = `👤 ${mergedData.name}\n📱 ${mergedData.phone}\n✉️ ${mergedData.email}`;
            
            // Format payment details with original amount striked off if discount is applied
            let paymentDetails = "";
            if (priceDetails.discountPercent > 0) {
                paymentDetails = `💰 Original Amount: ~₹${mergedData.original_amount}~\n${priceDetails.discountInfo}\n💵 Final Amount: ₹${mergedData.total_amount}`;
            } else {
                paymentDetails = `💰 Amount: ₹${mergedData.total_amount}`;
            }
            
            console.log('💾 Saving updated flow state with customer info...');
            await flowDbUtils.saveFlowState(flow_token, "SUMMARY", mergedData);
            console.log('✅ Flow state updated');
            
            return {
              screen: "SUMMARY",
              data: {
                ...SCREEN_RESPONSES.SUMMARY.data,
                sport: mergedData.sport || "",
                date: mergedData.date || "",
                duration: duration, // Use the preserved duration
                time_slot: timeSlot, // Use the preserved time_slot
                total_amount: mergedData.total_amount || "",
                original_amount: mergedData.original_amount || "",
                discount_info: mergedData.discount_info || "",
                name: mergedData.name || "",
                phone: mergedData.phone || "",
                email: mergedData.email || "",
                bookingdetails: bookingDetails,
                customerdetails: customerDetails,
                paymentdetails: paymentDetails,
                min_date: mergedData.min_date,
                max_date: mergedData.max_date
              }
            };
          }
          
          // If not transitioning to SUMMARY, return updated DETAILS screen
          console.log('💾 Saving updated flow state...');
          await flowDbUtils.saveFlowState(flow_token, "DETAILS", mergedData);
          console.log('✅ Flow state updated');
          
          return {
            screen: "DETAILS",
            data: {
              ...SCREEN_RESPONSES.DETAILS.data,
              ...mergedData,
            }
          };
        } catch (error) {
          console.error("❌ Error processing DETAILS screen:", error);
          return { 
            screen: "DETAILS",
            data: { 
              ...SCREEN_RESPONSES.DETAILS.data,
              error_message: "An error occurred. Please try again."
            } 
          };
        }
        
      case "SUMMARY":
        try {
          // Get current state
          console.log('📋 Fetching current flow state for SUMMARY screen...');
          const currentState = await flowDbUtils.getFlowState(flow_token) || {};
          console.log('📋 Current flow state:', JSON.stringify(currentState, null, 2));
          
          // Merge new data with existing data
          const mergedData = { ...currentState, ...data };
          console.log('🔄 Merged data:', JSON.stringify(mergedData, null, 2));
          
          // Check if this is a complete booking request (agree_terms and agree_cancellation are true)
          if (data.agree_terms && data.agree_cancellation) {
            console.log('✅ Booking confirmed, processing payment...');
            
            try {
              // Create booking
              const bookingData = {
                sport: mergedData.sport,
                date: mergedData.date,
                duration: mergedData.duration,
                time_slot: mergedData.time_slot,
                customer_name: mergedData.name,
                customer_phone: mergedData.phone,
                customer_email: mergedData.email,
                amount: mergedData.total_amount.toString(), // Ensure amount is a string
                status: 'pending'
              };
              
              console.log('📝 Creating booking with data:', bookingData);
              const bookingId = await flowDbUtils.createBooking(bookingData);
              console.log('✅ Booking created with ID:', bookingId);

              // Check if payment was requested
              if (data.payment_requested) {
                console.log('💳 Payment requested, generating payment links...');
                console.log('💳 Selected payment method:', data.payment_method);
                
                // Create booking data object for payment link generation
                const bookingData = {
                  bookingId,
                  sport: mergedData.sport,
                  date: mergedData.date,
                  duration: mergedData.duration,
                  time_slot: mergedData.time_slot,
                  customer_name: mergedData.name,
                  customer_phone: mergedData.phone,
                  customer_email: mergedData.email,
                  amount: mergedData.total_amount
                };
                
                // Generate UPI payment link if UPI payment method is selected
                if (data.payment_method === 'upi') {
                  console.log('🔄 Generating UPI payment link...');
                  
                  // Use the helper function to generate UPI link
                  const upiLink = flowDbUtils.generateUpiPaymentLink(bookingData);
                  
                  // Update booking with payment information
                  await flowDbUtils.updateBooking(bookingId, {
                    upi_link: upiLink,
                    payment_method: 'upi'
                  });
                  
                  // Save payment link
                  mergedData.upi_link = upiLink;
                  mergedData.invoice_url = null;
                } 
                // Generate Razorpay payment link if card/online payment method is selected
                else if (data.payment_method === 'razorpay') {
                  console.log('🔄 Generating Razorpay payment link...');
                  try {
                    // Use the helper function to generate Razorpay link
                    const invoiceUrl = await flowDbUtils.generateRazorpayLink(bookingData);
                    
                    // Update booking with payment information
                    await flowDbUtils.updateBooking(bookingId, {
                      invoice_url: invoiceUrl,
                      payment_method: 'razorpay'
                    });
                    
                    // Save payment link
                    mergedData.invoice_url = invoiceUrl;
                    mergedData.upi_link = null;
                  } catch (razorpayError) {
                    console.error('❌ Error creating Razorpay payment:', razorpayError);
                    // Fallback to UPI if Razorpay fails
                    console.log('🔄 Falling back to UPI payment...');
                    
                    // Use the helper function to generate UPI link as fallback
                    const upiLink = flowDbUtils.generateUpiPaymentLink(bookingData);
                    
                    // Update booking with payment information
                    await flowDbUtils.updateBooking(bookingId, {
                      upi_link: upiLink,
                      payment_method: 'upi'
                    });
                    
                    // Save payment link
                    mergedData.upi_link = upiLink;
                    mergedData.invoice_url = null;
                  }
                }
                // If payment method is not specified or is an array, default to UPI
                else {
                  console.log('⚠️ Payment method not specified or is an array, defaulting to UPI');
                  
                  // Use the helper function to generate UPI link
                  const upiLink = flowDbUtils.generateUpiPaymentLink(bookingData);
                  
                  // Update booking with payment information
                  await flowDbUtils.updateBooking(bookingId, {
                    upi_link: upiLink,
                    payment_method: 'upi'
                  });
                  
                  // Save payment link
                  mergedData.upi_link = upiLink;
                  mergedData.invoice_url = null;
                }
              }
              
              // Prepare cancellation policy
              const cancellationPolicy = "100% refund: Cancel >2 hours before booking.\n75% refund: Cancel 1-2 hours before.\nNo refund: Cancel <1 hour before.";
              
              // Save the updated state with booking and payment info
              console.log('💾 Saving final flow state with payment info...');
              mergedData.booking_id = bookingId;
              await flowDbUtils.saveFlowState(flow_token, "SUCCESS", mergedData);
              
              // Return SUCCESS screen with payment links
              console.log('🔄 Transitioning to SUCCESS screen');
              return {
                screen: "SUCCESS",
                data: {
                  ...SCREEN_RESPONSES.SUCCESS.data,
                  upi_link: mergedData.upi_link || "",
                  invoice_url: mergedData.invoice_url || "",
                  cancellation_policy: cancellationPolicy,
                  extension_message_response: {
                    params: {
                      flow_token: flow_token,
                      booking_id: bookingId
                    }
                  }
                }
              };
            } catch (error) {
              console.error('❌ Error processing booking:', error);
              
              // Return to SUMMARY screen with error
              return {
                screen: "SUMMARY",
                data: {
                  ...SCREEN_RESPONSES.SUMMARY.data,
                  ...mergedData,
                  sport: mergedData.sport || "",
                  date: mergedData.date || "",
                  duration: mergedData.duration || "",
                  time_slot: mergedData.time_slot || "",
                  total_amount: mergedData.total_amount || "0",
                  original_amount: mergedData.original_amount || "0",
                  discount_info: mergedData.discount_info || "",
                  name: mergedData.name || "",
                  phone: mergedData.phone || "",
                  email: mergedData.email || "",
                  error_message: "Failed to create booking. Please try again."
                }
              };
            }
          }
          
          // Save the updated state
          console.log('💾 Saving updated flow state...');
          await flowDbUtils.saveFlowState(flow_token, "SUMMARY", mergedData);
          
          // Return updated SUMMARY screen
          return {
            screen: "SUMMARY",
            data: {
              ...SCREEN_RESPONSES.SUMMARY.data,
              sport: mergedData.sport || "",
              date: mergedData.date || "",
              duration: mergedData.duration || "",
              time_slot: mergedData.time_slot || "",
              total_amount: mergedData.total_amount || "0",
              original_amount: mergedData.original_amount || "0",
              discount_info: mergedData.discount_info || "",
              name: mergedData.name || "",
              phone: mergedData.phone || "",
              email: mergedData.email || "",
              bookingdetails: mergedData.bookingdetails || "",
              customerdetails: mergedData.customerdetails || "",
              paymentdetails: mergedData.paymentdetails || ""
            }
          };
        } catch (error) {
          console.error("❌ Error processing SUMMARY screen:", error);
          
          // Create a fallback payment link
          const fallbackPaymentLink = `https://pitzone-sports.com/payment-error?flow_token=${flow_token}&error=${encodeURIComponent(error.message || "Unknown error")}`;
          
          return {
            screen: "SUCCESS",
            data: {
              invoice_url: fallbackPaymentLink,
              extension_message_response: {
                params: {
                  flow_token,
                  error: "Failed to process payment. Please try again later."
                },
              },
            },
          };
        }

      case "SUCCESS":
        try {
          // Get current state
          console.log('📋 Fetching current flow state for SUCCESS screen...');
          const currentState = await flowDbUtils.getFlowState(flow_token) || {};
          console.log('📋 Current flow state:', JSON.stringify(currentState, null, 2));
          
          // Merge new data with existing data
          const mergedData = { ...currentState, ...data };
          console.log('🔄 Merged data:', JSON.stringify(mergedData, null, 2));
          
          // Check if payment processing is requested
          if (data.process_payment && data.payment_method) {
            console.log('💳 Processing payment with method:', data.payment_method);
            
            // Determine which payment URL to use based on selected method
            let paymentUrl = '';
            if (data.payment_method === 'upi') {
              paymentUrl = mergedData.upi_link;
              console.log('🔗 Redirecting to UPI payment:', paymentUrl);
            } else if (data.payment_method === 'online') {
              paymentUrl = mergedData.invoice_url;
              console.log('🔗 Redirecting to online payment:', paymentUrl);
            }
            
            // Return navigation response to redirect to payment URL
            if (paymentUrl) {
              console.log('🔄 Redirecting to payment URL:', paymentUrl);
              return {
                screen: "SUCCESS",
                action_response: {
                  name: "navigate",
                  next: {
                    type: "url",
                    url: paymentUrl
                  }
                }
              };
            }
          }
          
          // If not processing payment, just update the state
          console.log('💾 Saving updated flow state...');
          await flowDbUtils.saveFlowState(flow_token, "SUCCESS", mergedData);
          console.log('✅ Flow state updated');
          
          return {
            screen: "SUCCESS",
            data: {
              ...SCREEN_RESPONSES.SUCCESS.data,
              ...mergedData
            }
          };
        } catch (error) {
          console.error('❌ Error processing SUCCESS screen:', error);
          return {
            screen: "SUCCESS",
            data: {
              ...SCREEN_RESPONSES.SUCCESS.data,
              error_message: "An error occurred. Please try again."
            }
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


