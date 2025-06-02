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
      }
      
      // Format sports for Dropdown with dynamic data
      const formattedSports = sportsFacilities.map(sport => ({
        id: sport.id,
        title: sport.title,
        image: sport.imageUrl || (sport.id === 'badminton' ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' : 
               sport.id === 'cricket' ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' : 
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='),
        description: sport.description || `${sport.title} court`,
        metadata: `₹${sport.baseRate}/hr`
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
        is_footer_enabled: false
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
          is_footer_enabled: false
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
          
          // Merge new data with existing data
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
          
          // Save the updated state with visibility flags
          console.log('💾 Saving updated flow state...');
          await flowDbUtils.saveFlowState(flow_token, "BOOKING", {
            ...mergedData,
            ...visibilityFlags
          });
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
                time_slot: mergedData.time_slot || "",
                discount_info: discountInfo || "",
                total_amount: finalAmount.toString(),
                original_amount: originalAmount.toString(),
                // Pre-fill customer data if existing customer
                name: existingCustomer?.name || "",
                phone: existingCustomer?.phoneNumber || phoneNumber || "",
                email: existingCustomer?.email || "",
                is_existing_customer: isExistingCustomer,
                show_new_customer_message: !isExistingCustomer,
                show_existing_customer_message: isExistingCustomer
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
              time_slot: mergedData.time_slot || "",
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
          
          // Merge new data with existing data
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
            
            // Calculate price details if not already calculated
            let priceDetails;
            
            // Ensure duration has a valid value (default to 1 if empty or invalid)
            if (!mergedData.duration || isNaN(parseFloat(mergedData.duration))) {
              console.log('⚠️ Duration is missing or invalid, defaulting to 1 hour');
              mergedData.duration = "1";
            } else {
              // Ensure duration is preserved as a string
              console.log('✅ Using existing duration value:', mergedData.duration);
              mergedData.duration = mergedData.duration.toString();
            }
            
            console.log('💰 Calculating price details with duration:', mergedData.duration);
            priceDetails = flowDbUtils.calculatePriceHelper(mergedData.sport, parseFloat(mergedData.duration));
            
            mergedData.total_amount = priceDetails.finalAmount;
            mergedData.original_amount = priceDetails.originalAmount;
            mergedData.discount_info = priceDetails.discountInfo;
            
            // Format details for display in SUMMARY screen
            const bookingDetails = flowDbUtils.formatBookingDetails(mergedData);
            const customerDetails = flowDbUtils.formatCustomerDetails(mergedData);
            const priceDiff = flowDbUtils.formatPriceDifference(mergedData);
            
            console.log('💾 Saving updated flow state with customer info...');
            await flowDbUtils.saveFlowState(flow_token, "SUMMARY", mergedData);
            console.log('✅ Flow state updated');
            
            return {
              screen: "SUMMARY",
              data: {
                ...SCREEN_RESPONSES.SUMMARY.data,
                sport: mergedData.sport || "",
                date: mergedData.date || "",
                duration: mergedData.duration || "1", // Ensure duration has a value
                time_slot: mergedData.time_slot || "",
                total_amount: mergedData.total_amount || "",
                original_amount: mergedData.original_amount || "",
                discount_info: mergedData.discount_info || "",
                name: mergedData.name || "",
                phone: mergedData.phone || "",
                email: mergedData.email || "",
                bookingdetails: bookingDetails,
                customerdetails: customerDetails,
                pricediff: priceDiff,
                coupon_applied: false,
                has_coupon_error: false
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
          
          // Check if this includes a coupon application request
          if (data.apply_coupon || data.coupon) {
            console.log('🎟️ Validating coupon:', data.coupon || mergedData.coupon);
            
            // Validate coupon
            try {
              const couponCode = data.coupon || mergedData.coupon;
              
              // Skip validation if coupon code is empty
              if (!couponCode || couponCode.trim() === '') {
                console.log('⚠️ Empty coupon code, skipping validation');
                
                // If there was a previously applied coupon, remove its effects
                if (mergedData.coupon_applied) {
                  console.log('🔄 Removing previously applied coupon');
                  
                  // Recalculate price without coupon
                  if (!mergedData.duration || isNaN(parseFloat(mergedData.duration))) {
                    mergedData.duration = "1"; // Default to 1 hour if duration is invalid
                  }
                  
                  const recalculatedPrice = flowDbUtils.calculatePriceHelper(mergedData.sport, parseFloat(mergedData.duration));
                  mergedData.total_amount = recalculatedPrice.finalAmount;
                  mergedData.original_amount = recalculatedPrice.originalAmount;
                  mergedData.discount_info = recalculatedPrice.discountInfo;
                  
                  // Reset coupon-related fields
                  mergedData.coupon_applied = false;
                  mergedData.has_coupon_error = false;
                  mergedData.coupon = '';
                  mergedData.coupon_discount = '0';
                  
                  // Update formatted display data
                  mergedData.bookingdetails = flowDbUtils.formatBookingDetails(mergedData);
                  mergedData.pricediff = flowDbUtils.formatPriceDifference(mergedData);
                  
                  console.log('💾 Saving updated flow state after coupon removal...');
                  await flowDbUtils.saveFlowState(flow_token, "SUMMARY", mergedData);
                  
                  return {
                    screen: "SUMMARY",
                    data: {
                      ...SCREEN_RESPONSES.SUMMARY.data,
                      ...mergedData
                    }
                  };
                }
                
                // If no coupon was applied before, just continue with the current state
                return {
                  screen: "SUMMARY",
                  data: {
                    ...SCREEN_RESPONSES.SUMMARY.data,
                    ...mergedData,
                    has_coupon_error: false
                  }
                };
              }
              
              // Ensure we have a valid total_amount before validating the coupon
              const totalAmount = parseFloat(mergedData.total_amount);
              if (isNaN(totalAmount)) {
                console.error('❌ Invalid total_amount for coupon validation:', mergedData.total_amount);
                
                // Recalculate price if total amount is NaN
                if (!mergedData.duration || isNaN(parseFloat(mergedData.duration))) {
                  mergedData.duration = "1"; // Default to 1 hour if duration is invalid
                }
                
                const recalculatedPrice = flowDbUtils.calculatePriceHelper(mergedData.sport, parseFloat(mergedData.duration));
                mergedData.total_amount = recalculatedPrice.finalAmount;
                mergedData.original_amount = recalculatedPrice.originalAmount;
                mergedData.discount_info = recalculatedPrice.discountInfo;
              }
              
              const couponResult = flowDbUtils.validateCouponHelper(
                couponCode,
                parseFloat(mergedData.total_amount)
              );
              
              // Update merged data with coupon result
              if (couponResult.valid) {
                console.log('✅ Valid coupon:', couponResult);
                mergedData.coupon_applied = true;
                mergedData.has_coupon_error = false;
                mergedData.coupon = couponResult.couponCode;
                mergedData.coupon_discount = couponResult.discountAmount;
                mergedData.total_amount = couponResult.finalAmount;
                mergedData.discount_info = couponResult.discountInfo;
              } else {
                console.log('❌ Invalid coupon:', couponResult);
                mergedData.coupon_applied = false;
                mergedData.has_coupon_error = true;
                mergedData.coupon_error = couponResult.couponError;
              }
              
              // Update formatted display data
              mergedData.bookingdetails = flowDbUtils.formatBookingDetails(mergedData);
              mergedData.pricediff = flowDbUtils.formatPriceDifference(mergedData);
              
              console.log('💾 Saving updated flow state with coupon info...');
              await flowDbUtils.saveFlowState(flow_token, "SUMMARY", mergedData);
              console.log('✅ Flow state updated');
              
              // Return updated data for same screen
              return {
                screen: "SUMMARY",
                data: {
                  ...SCREEN_RESPONSES.SUMMARY.data,
                  ...mergedData
                }
              };
            } catch (error) {
              console.error('❌ Error validating coupon:', error);
              return {
                screen: "SUMMARY",
                data: {
                  ...SCREEN_RESPONSES.SUMMARY.data,
                  ...mergedData,
                  has_coupon_error: true,
                  coupon_error: "Error validating coupon. Please try again."
                }
              };
            }
          }
          
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
                amount: mergedData.total_amount,
                coupon: mergedData.coupon || null,
                status: 'pending'
              };
              
              console.log('📝 Creating booking with data:', bookingData);
              const bookingId = await flowDbUtils.createBooking(bookingData);
              console.log('✅ Booking created with ID:', bookingId);

              // Check if payment was requested
              if (data.payment_requested) {
                console.log('💳 Payment requested, generating UPI payment link...');
                
                // Generate a UPI payment intent link 
                const amount = parseFloat(mergedData.total_amount).toFixed(2);
                const merchantVpa = "pitzoneaa@paytm"; // Replace with your actual VPA
                const merchantName = "PitZone Sports";
                const referenceId = bookingId || `order_${Date.now()}`;
                const description = `Booking for ${mergedData.sport} on ${mergedData.date}`;
                
                // Generate UPI intent URL
                const upiLink = `upi://pay?pa=${merchantVpa}&pn=${encodeURIComponent(merchantName)}&tr=${referenceId}&am=${amount}&cu=INR&mode=00&purpose=00&mc=5399&tn=${encodeURIComponent(description)}`;
                
                console.log('🔗 Generated UPI payment link:', upiLink);
                
                // Generate a fallback web payment URL (e.g., Razorpay)
                const webPaymentUrl = `https://pitzone-sports.com/payments/${bookingId}`;
                
                // Save payment information
                mergedData.invoice_url = webPaymentUrl;
                mergedData.upi_link = upiLink;
                mergedData.booking_id = bookingId;
              }
              
              // Transition to SUCCESS screen
              console.log('🔄 Transitioning to SUCCESS screen');
              
              // Save final state
              await flowDbUtils.saveFlowState(flow_token, "SUCCESS", {
                ...mergedData,
                booking_id: bookingId
              });
              
              // Generate invoice URL (replace with actual URL generation logic)
              const invoiceUrl = mergedData.invoice_url || `https://pitzone-sports.com/payments/${bookingId}`;
              
              return {
                screen: "SUCCESS",
                data: {
                  ...SCREEN_RESPONSES.SUCCESS.data,
                  invoice_url: invoiceUrl,
                  extension_message_response: {
                    params: {
                      flow_token: flow_token,
                      booking_id: bookingId
                    }
                  }
                }
              };
            } catch (error) {
              console.error('❌ Error creating booking:', error);
              return {
                screen: "SUMMARY",
                data: {
                  ...SCREEN_RESPONSES.SUMMARY.data,
                  ...mergedData,
                  error_message: "Failed to create booking. Please try again."
                }
              };
            }
          }
          
          // If not transitioning to SUCCESS, return updated SUMMARY screen
          console.log('💾 Saving updated flow state...');
          await flowDbUtils.saveFlowState(flow_token, "SUMMARY", mergedData);
          console.log('✅ Flow state updated');
          
          return {
            screen: "SUMMARY",
            data: {
              ...SCREEN_RESPONSES.SUMMARY.data,
              ...mergedData
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


