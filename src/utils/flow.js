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
      
      // Format sports for RadioButtonsGroup with dynamic data
      const formattedSports = sportsFacilities.map(sport => ({
        id: sport.id,
        title: sport.title,
        image: sport.imageUrl || (sport.id === 'badminton' ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' : 
               sport.id === 'cricket' ? 'https://www.bing.com/images/search?q=cricket%20photo&FORM=IQFRBA&id=4EB3BB378E53EAA46D569563A3A6F83E3E801B15' : 
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
          
          // Check if this is a footer click (transition to next screen)
          // If the footer is enabled and the request came from a footer click
          // (indicated by all required fields being present), transition to SUMMARY screen
          if (data.is_footer_enabled === true || 
              (mergedData.sport && mergedData.date && mergedData.duration && mergedData.time_slot && 
               data.time_slot)) {
            console.log('🔄 Footer clicked, transitioning to SUMMARY screen');
            
            // Calculate total amount based on duration, sport, date and time using dynamic configuration
            console.log('💰 Calculating price dynamically based on sport, duration, date and time');
            const priceDetails = await flowDbUtils.calculatePrice(mergedData.sport, mergedData.duration, mergedData.date, mergedData.time_slots);
            
            // Extract price details
            const { baseRate, totalBeforeDiscount, discountPercent, discountAmount, totalAmount } = priceDetails;
            
            return {
              screen: "SUMMARY", // Change screen to SUMMARY according to routing model
              data: {
                ...SCREEN_RESPONSES.SUMMARY.data,
                sport: mergedData.sport || "",
                date: mergedData.date || "",
                duration: mergedData.duration || "",
                time_slot: mergedData.time_slot || "",
                discount_info: discountPercent > 0 ? `You qualify for ${discountPercent}% off!` : "",
                total_amount: totalAmount.toString(),
                base_rate: baseRate.toString(),
                // Add time and day specific pricing information
                rate_info: priceDetails.dayType && priceDetails.timePeriod ? 
                  `${priceDetails.dayType.charAt(0).toUpperCase() + priceDetails.dayType.slice(1)} ${priceDetails.timePeriod} rate applied` : "",
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
                pricingInfo = `₹${weekdayMorning}-${weekendEvening}/hr (varies by day/time)`;
              }
            }
            
            return {
              id: sport.id,
              title: sport.title,
              image: sport.imageUrl || (sport.id === 'badminton' ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' : 
                     sport.id === 'cricket' ? 'https://www.bing.com/images/search?q=cricket%20photo&FORM=IQFRBA&id=4EB3BB378E53EAA46D569563A3A6F83E3E801B15' : 
                    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='),
              description: sport.description || `${sport.title} court`,
              metadata: pricingInfo
            };
          }));
          
          // Get sport configuration for the selected sport or default to first sport
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
           // Default time slots (to avoid ChipsSelector error)
          let timeSlots = [
            { id: "09:00", title: "9:00 AM" },
            { id: "17:00", title: "5:00 PM" }
          ];
          
          // Navigation options for time slots
          let timeSlotOptions = [];
          let currentPage = 0;
          
          if (mergedData.sport && mergedData.date && mergedData.duration) {
            console.log('🕒 Fetching time slots with params:', {
              sport: mergedData.sport,
              date: mergedData.date,
              duration: mergedData.duration,
              timeOfDay: mergedData.time_of_day || 'all',
              page: mergedData.page || 0
            });
            
            try {
              // Get page number from data if available
              currentPage = mergedData.page || 0;
              
              // Get all available slots with pagination
              const slotsResult = await flowDbUtils.getAvailableTimeSlots(
                mergedData.sport,
                mergedData.date,
                mergedData.duration,
                mergedData.time_of_day,
                currentPage
              );
              
              // Update timeSlots with the fetched slots
              if (slotsResult.slots && slotsResult.slots.length > 0) {
                timeSlots = slotsResult.slots;
                
                // Add navigation options if needed
                if (slotsResult.pagination.hasMorePages) {
                  timeSlotOptions.push({
                    id: `page_${currentPage + 1}`,
                    title: "Show More Time Slots",
                    description: "View next page of available times"
                  });
                }
                
                if (slotsResult.pagination.hasPreviousPages) {
                  timeSlotOptions.push({
                    id: `page_${currentPage - 1}`,
                    title: "Show Previous Time Slots",
                    description: "View previous page of available times"
                  });
                }
                
                // Add time of day filter options if there are slots in those periods
                if (!mergedData.time_of_day) {
                  if (slotsResult.timeOfDayCounts.morning > 0) {
                    timeSlotOptions.push({
                      id: "filter_morning",
                      title: "Morning Slots",
                      description: `${slotsResult.timeOfDayCounts.morning} slots available`
                    });
                  }
                  
                  if (slotsResult.timeOfDayCounts.afternoon > 0) {
                    timeSlotOptions.push({
                      id: "filter_afternoon",
                      title: "Afternoon Slots",
                      description: `${slotsResult.timeOfDayCounts.afternoon} slots available`
                    });
                  }
                  
                  if (slotsResult.timeOfDayCounts.evening > 0) {
                    timeSlotOptions.push({
                      id: "filter_evening",
                      title: "Evening Slots",
                      description: `${slotsResult.timeOfDayCounts.evening} slots available`
                    });
                  }
                } else {
                  // Option to view all time slots
                  timeSlotOptions.push({
                    id: "filter_all",
                    title: "View All Time Slots",
                    description: "Remove time of day filter"
                  });
                }
                
                // Always add option to change date
                timeSlotOptions.push({
                  id: "change_date",
                  title: "Change Date",
                  description: "Select a different date"
                });
              } else if (slotsResult.timeOfDayCounts) {
                // No slots on current page, but slots might exist in other time periods
                const { morning, afternoon, evening } = slotsResult.timeOfDayCounts;
                const totalSlots = morning + afternoon + evening;
                
                if (totalSlots > 0) {
                  // Add time of day options if there are slots in those periods
                  if (morning > 0) {
                    timeSlotOptions.push({
                      id: "filter_morning",
                      title: "Morning Slots",
                      description: `${morning} slots available`
                    });
                  }
                  
                  if (afternoon > 0) {
                    timeSlotOptions.push({
                      id: "filter_afternoon",
                      title: "Afternoon Slots",
                      description: `${afternoon} slots available`
                    });
                  }
                  
                  if (evening > 0) {
                    timeSlotOptions.push({
                      id: "filter_evening",
                      title: "Evening Slots",
                      description: `${evening} slots available`
                    });
                  }
                } else {
                  // No slots available at all, suggest changing date
                  timeSlotOptions.push({
                    id: "change_date",
                    title: "Change Date",
                    description: "No slots available on this date"
                  });
                }
              }
              
              console.log(`✅ Found ${timeSlots.length} time slots for page ${currentPage+1}`);
            } catch (error) {
              console.error('❌ Error fetching time slots:', error);
              // Add option to change date on error
              timeSlotOptions.push({
                id: "change_date",
                title: "Change Date",
                description: "Try a different date"
              });
            }
          }
          
          // Process time slot selection actions
          if (mergedData.time_slot && mergedData.time_slot.startsWith('page_')) {
            // Handle pagination action
            const pageNumber = parseInt(mergedData.time_slot.split('_')[1], 10);
            console.log(`🔄 Changing to page ${pageNumber}`);
            
            // Update page number and clear time slot selection
            mergedData.page = pageNumber;
            mergedData.time_slot = '';
            
            // Save the updated state
            await flowDbUtils.saveFlowState(flow_token, "BOOKING", {
              ...mergedData,
              page: pageNumber,
              time_slot: ''
            });
          } else if (mergedData.time_slot && mergedData.time_slot.startsWith('filter_')) {
            // Handle time of day filter action
            const filter = mergedData.time_slot.split('_')[1];
            console.log(`🔄 Applying time filter: ${filter}`);
            
            if (filter === 'all') {
              // Clear time of day filter
              mergedData.time_of_day = '';
              mergedData.page = 0; // Reset to first page
            } else {
              // Set time of day filter
              mergedData.time_of_day = filter;
              mergedData.page = 0; // Reset to first page
            }
            
            // Clear time slot selection
            mergedData.time_slot = '';
            
            // Save the updated state
            await flowDbUtils.saveFlowState(flow_token, "BOOKING", {
              ...mergedData,
              time_of_day: mergedData.time_of_day,
              page: mergedData.page,
              time_slot: ''
            });
          } else if (mergedData.time_slot && mergedData.time_slot === 'change_date') {
            // Handle change date action
            console.log('🔄 User wants to change date');
            
            // Clear date selection to allow reselection
            mergedData.date = '';
            mergedData.time_slot = '';
            mergedData.page = 0;
            mergedData.time_of_day = '';
            
            // Update visibility flags
            visibilityFlags.is_date_enabled = true;
            visibilityFlags.is_duration_enabled = false;
            visibilityFlags.is_time_slots_enabled = false;
            visibilityFlags.is_footer_enabled = false;
            
            // Save the updated state
            await flowDbUtils.saveFlowState(flow_token, "BOOKING", {
              ...mergedData,
              date: '',
              time_slot: '',
              page: 0,
              time_of_day: '',
              ...visibilityFlags
            });
          }
          
          // Combine regular time slots with navigation options
          const combinedTimeSlots = [...timeSlots];
          
          // Add navigation and filter options if available
          if (timeSlotOptions.length > 0) {
            // Only add up to 2 options to stay within WhatsApp limits
            const limitedOptions = timeSlotOptions.slice(0, 2);
            combinedTimeSlots.push(...limitedOptions);
          }
          
          return {
            ...SCREEN_RESPONSES.BOOKING,
            data: {
              ...SCREEN_RESPONSES.BOOKING.data,
              sports: formattedSports,
              durations: formattedDurations,
              time_slots: combinedTimeSlots, 
              sport: mergedData.sport || "",
              date: mergedData.date || "",
              duration: mergedData.duration || "",
              time_slot: mergedData.time_slot || "", 
              page: mergedData.page || 0,
              time_of_day: mergedData.time_of_day || "",
              ...visibilityFlags
            },
          };
        } catch (error) {
          console.error("❌ Error processing BOOKING data exchange:", error);
          return { ...SCREEN_RESPONSES.BOOKING };
        }
        
      case "SUMMARY":
        try {
          console.log('💳 Processing SUMMARY screen with payment integration');
          await flowDbUtils.saveFlowState(flow_token, "SUMMARY", data);
          
          // Get Razorpay service
          const razorpayService = require('../services/razorpay');
          const config = require('../config');
          
          // Create booking details object
          const bookingDetails = {
            sport: data.sport,
            date: data.date,
            duration: data.duration,
            time_slot: data.time_slot,
            total_amount: data.total_amount,
            name: data.name,
            phone: data.phone,
            email: data.email || '',
            agree_cancellation: data.agree_cancellation,
            agree_terms: data.agree_terms
          };
          
          console.log('📋 Booking details:', bookingDetails);
          
          // Create a Razorpay order
          const orderData = {
            amount: parseFloat(data.total_amount),
            currency: 'INR',
            receipt: `booking_${flow_token}`,
            notes: {
              sport: data.sport,
              date: data.date,
              duration: data.duration,
              time_slot: data.time_slot,
              flow_token: flow_token
            }
          };
          
          console.log('🔄 Creating Razorpay order with data:', orderData);
          
          // Create the order
          const order = await razorpayService.createOrder(orderData);
          console.log('✅ Razorpay order created:', order.id);
          
          // Generate payment link
          const paymentLink = `https://api.razorpay.com/v1/checkout/embedded?key_id=${config.razorpay.keyId}&order_id=${order.id}&name=${encodeURIComponent('PITZONE Sports')}&description=${encodeURIComponent(`Booking for ${data.sport} on ${data.date}`)}&prefill[name]=${encodeURIComponent(data.name || '')}&prefill[contact]=${encodeURIComponent(data.phone || '')}&prefill[email]=${encodeURIComponent(data.email || '')}`;
          
          // Save order details to flow state
          await flowDbUtils.saveFlowState(flow_token, "SUMMARY", {
            ...data,
            razorpay_order_id: order.id,
            payment_link: paymentLink
          });
          
          return {
            screen: "SUCCESS",
            data: {
              invoice_url: paymentLink,
              extension_message_response: {
                params: {
                  flow_token,
                  booking_details: JSON.stringify(bookingDetails),
                  razorpay_order_id: order.id
                },
              },
            },
          };
        } catch (error) {
          console.error("❌ Error processing SUMMARY screen:", error);
          
          // Create a fallback payment link
          const fallbackPaymentLink = `https://pitzone-sports.com/payment-error?flow_token=${flow_token}`;
          
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


