/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const flowDbUtils = require('./flowDbUtils');
const connectToDatabase = require('./connect-to-database');

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

// this object is generated from Flow Builder under "..." > Endpoint > Snippets > Responses
const SCREEN_RESPONSES = {
  APPOINTMENT: {
    screen: "APPOINTMENT",
    data: {
      department: [
        {
          id: "badminton",
          title: "Badminton",
        },
        {
          id: "cricket",
          title: "Cricket",
        },
        {
          id: "pickleball",
          title: "Pickleball",
        },
      ],
      location: [
        {
          id: "badminton-1",
          title: "Badminton Court 1",
        },
        {
          id: "badminton-2",
          title: "Badminton Court 2",
        },
        {
          id: "cricket-1",
          title: "Cricket Ground",
        },
        {
          id: "pickleball-1",
          title: "Pickleball Court",
        },
      ],
      is_location_enabled: true,
      date: [
        // Will be dynamically populated with next 7 days
      ],
      is_date_enabled: true,
      time: [
        // Will be dynamically populated based on availability
      ],
      is_time_enabled: true,
    },
  },
  DETAILS: {
    screen: "DETAILS",
    data: {
      sport: "badminton",
      location: "badminton-1",
      date: "2024-01-01",
      time: "10:00",
    },
  },
  SUMMARY: {
    screen: "SUMMARY",
    data: {
      appointment:
        "Badminton Court 1\nMon Jan 01 2024 at 10:00.",
      details:
        "Name: John Doe\nEmail: john@example.com\nPhone: 123456789\n\nNo special requirements",
      sport: "badminton",
      location: "badminton-1",
      date: "2024-01-01",
      time: "10:00",
      name: "John Doe",
      email: "john@example.com",
      phone: "123456789",
      more_details: "No special requirements",
    },
  },
  TERMS: {
    screen: "TERMS",
    data: {},
  },
  SUCCESS: {
    screen: "SUCCESS",
    data: {
      extension_message_response: {
        params: {
          flow_token: "REPLACE_FLOW_TOKEN",
          some_param_name: "PASS_CUSTOM_VALUE",
        },
      },
    },
  },
};
const getNextScreen = async (decryptedBody) => {
  const { screen, data, version, action, flow_token } = decryptedBody;
  
  // Connect to database
  await connectToDatabase();
  
  // handle health check request
  if (action === "ping") {
    return {
      data: {
        status: "active",
      },
    };
  }

  // handle error notification
  if (data?.error) {
    console.warn("Received client error:", data);
    return {
      data: {
        acknowledged: true,
      },
    };
  }

  // handle initial request when opening the flow and display APPOINTMENT screen
  if (action === "INIT") {
    try {
      // Get dynamic data from database
      const sportsFacilities = await flowDbUtils.getSportsFacilities();
      const availableDates = await flowDbUtils.getAvailableDates();
      
      // Save initial flow state
      await flowDbUtils.saveFlowState(flow_token, "APPOINTMENT", {});
      
      return {
        ...SCREEN_RESPONSES.APPOINTMENT,
        data: {
          ...SCREEN_RESPONSES.APPOINTMENT.data,
          // Update with dynamic data
          department: sportsFacilities,
          date: availableDates,
          // these fields are disabled initially. Each field is enabled when previous fields are selected
          is_location_enabled: false,
          is_date_enabled: false,
          is_time_enabled: false,
        },
      };
    } catch (error) {
      console.error("Error initializing flow:", error);
      // Fallback to static data if database fails
      return {
        ...SCREEN_RESPONSES.APPOINTMENT,
        data: {
          ...SCREEN_RESPONSES.APPOINTMENT.data,
          is_location_enabled: false,
          is_date_enabled: false,
          is_time_enabled: false,
        },
      };
    }
  }

  if (action === "data_exchange") {
    // handle the request based on the current screen
    switch (screen) {
      // handles when user interacts with APPOINTMENT screen
      case "APPOINTMENT":
        try {
          // Save current selections to database
          if (data.sport || data.location || data.date || data.time) {
            await flowDbUtils.saveFlowState(flow_token, "APPOINTMENT", data);
          }
          
          // Filter locations based on selected sport
          let filteredLocations = SCREEN_RESPONSES.APPOINTMENT.data.location;
          if (data.sport) {
            filteredLocations = SCREEN_RESPONSES.APPOINTMENT.data.location.filter(
              location => location.id.startsWith(data.sport)
            );
          }
          
          // Get available dates
          const availableDates = await flowDbUtils.getAvailableDates();
          
          // Get available time slots if sport and date are selected
          let availableTimeSlots = [];
          if (data.sport && data.date) {
            availableTimeSlots = await flowDbUtils.getAvailableTimeSlots(data.sport, data.date);
          }
          
          return {
            ...SCREEN_RESPONSES.APPOINTMENT,
            data: {
              // copy initial screen data then override specific fields
              ...SCREEN_RESPONSES.APPOINTMENT.data,
              // each field is enabled only when previous fields are selected
              is_location_enabled: Boolean(data.sport),
              is_date_enabled: Boolean(data.sport) && Boolean(data.location),
              is_time_enabled:
                Boolean(data.sport) &&
                Boolean(data.location) &&
                Boolean(data.date),

              // Update with dynamic filtered data
              location: filteredLocations,
              date: availableDates,
              time: availableTimeSlots.length > 0 ? availableTimeSlots : SCREEN_RESPONSES.APPOINTMENT.data.time,
              
              // Preserve user selections
              ...data,
            },
          };
        } catch (error) {
          console.error("Error processing APPOINTMENT screen:", error);
          // Fallback to basic filtering if database fails
          return {
            ...SCREEN_RESPONSES.APPOINTMENT,
            data: {
              ...SCREEN_RESPONSES.APPOINTMENT.data,
              is_location_enabled: Boolean(data.sport),
              is_date_enabled: Boolean(data.sport) && Boolean(data.location),
              is_time_enabled: Boolean(data.sport) && Boolean(data.location) && Boolean(data.date),
              ...data,
            },
          };
        }

      // handles when user completes DETAILS screen
      case "DETAILS":
        try {
          // Save user details to database
          await flowDbUtils.saveFlowState(flow_token, "DETAILS", data);
          
          // Get facility name from ID
          const sportName = SCREEN_RESPONSES.APPOINTMENT.data.department.find(
            (sport) => sport.id === data.sport
          )?.title || data.sport;
          
          const locationName = SCREEN_RESPONSES.APPOINTMENT.data.location.find(
            (loc) => loc.id === data.location
          )?.title || data.location;
          
          // Format date from database or use provided date
          let dateName = data.date;
          const availableDates = await flowDbUtils.getAvailableDates();
          const dateObj = availableDates.find(d => d.id === data.date);
          if (dateObj) {
            dateName = dateObj.title;
          }

          const appointment = `${sportName} - ${locationName}\n${dateName} at ${data.time}`;

          const details = `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\n"${data.more_details || 'No special requirements'}"`;

          return {
            ...SCREEN_RESPONSES.SUMMARY,
            data: {
              appointment,
              details,
              // return the same fields sent from client back to submit in the next step
              ...data,
            },
          };
        } catch (error) {
          console.error("Error processing DETAILS screen:", error);
          // Fallback to basic formatting if database fails
          const appointment = `${data.sport} - ${data.location}\n${data.date} at ${data.time}`;
          const details = `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\n"${data.more_details || 'No special requirements'}"`;
          
          return {
            ...SCREEN_RESPONSES.SUMMARY,
            data: {
              appointment,
              details,
              ...data,
            },
          };
        }

      // handles when user completes SUMMARY screen
      case "SUMMARY":
        try {
          // Get the complete flow state with all user selections
          const flowState = await flowDbUtils.getFlowState(flow_token);
          
          // Create the booking in database
          const booking = await flowDbUtils.createBookingFromFlow(flowState || data);
          
          // send success response to complete and close the flow
          return {
            ...SCREEN_RESPONSES.SUCCESS,
            data: {
              extension_message_response: {
                params: {
                  flow_token,
                  booking_id: booking._id.toString(),
                },
              },
            },
          };
        } catch (error) {
          console.error("Error creating booking:", error);
          // Return success anyway to close the flow, but log the error
          return {
            ...SCREEN_RESPONSES.SUCCESS,
            data: {
              extension_message_response: {
                params: {
                  flow_token,
                  error: "Failed to create booking, please try again later.",
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
