import express from "express";
import { SCREEN_RESPONSES } from "../constants.js";
import { getAvailableSlots, saveFlowState, getFlowState } from "../utils/slotUtils.js";

const router = express.Router();

const updateScreenState = async (screen, data, flowToken) => {
  console.log('🔄 Updating screen state:', { screen, flowToken, data });
  
  switch (screen) {
    case "APPOINTMENT":
      console.log('📋 Processing APPOINTMENT screen update');
      const availableDurations = data.department
        ? SCREEN_RESPONSES.APPOINTMENT.data.location.filter((duration) => {
            if (data.department === "cricket") {
              return ["2hr", "3hr", "4hr"].includes(duration.id);
            }
            return ["1hr", "1.5hr", "2hr"].includes(duration.id);
          })
        : SCREEN_RESPONSES.APPOINTMENT.data.location;
      
      console.log(`📋 Filtered ${availableDurations.length} available durations`);

      const availableDates = data.department && data.location
        ? SCREEN_RESPONSES.APPOINTMENT.data.date
        : SCREEN_RESPONSES.APPOINTMENT.data.date;
      
      console.log('🕒 Fetching available time slots...');
      const availableTimes = data.department && data.location && data.date
        ? await getAvailableSlots(data.department, data.date, data.location)
        : SCREEN_RESPONSES.APPOINTMENT.data.time;
      console.log(`📋 Found ${availableTimes.length} available time slots`);

      const response = {
        ...SCREEN_RESPONSES.APPOINTMENT,
        data: {
          ...SCREEN_RESPONSES.APPOINTMENT.data,
          is_location_enabled: Boolean(data.department),
          is_date_enabled: Boolean(data.department) && Boolean(data.location),
          is_time_enabled:
            Boolean(data.department) &&
            Boolean(data.location) &&
            Boolean(data.date),
          location: availableDurations,
          date: availableDates,
          time: availableTimes,
          selected: {
            department: data.department || "",
            location: data.location || "",
            date: data.date || "",
            time: data.time || "",
          },
        },
      };

      console.log('💾 Saving flow state...');
      await saveFlowState(flowToken, screen, response.data.selected);
      console.log('✅ Flow state saved');
      
      return response;

    default:
      console.log(`⚠️ Unknown screen: ${screen}`);
      return SCREEN_RESPONSES[screen] || {};
  }
};

router.post("/flows", async (req, res) => {
  console.log('📥 Received WhatsApp API request:', {
    action: req.body?.action,
    hasData: !!req.body?.data
  });
  
  const { action, data } = req.body;

  if (action === "ping") {
    console.log('📡 Ping request received');
    res.json({ status: "active" });
  } else if (action === "data_exchange") {
    console.log('🔄 Data exchange request received');
    try {
      const { flow_token, screen, ...userData } = data || {};
      console.log('🔍 Getting flow state for token:', flow_token);
      const flowState = await getFlowState(flow_token);
      console.log('📋 Current flow state:', flowState);
      
      const mergedData = { ...flowState.data, ...userData };
      console.log('🔄 Merged data:', mergedData);
      
      console.log('🔄 Updating screen state...');
      const response = await updateScreenState(screen || flowState.screen, mergedData, flow_token);
      console.log('📤 Sending response');
      res.json(response);
    } catch (error) {
      console.error('❌ Error processing data exchange:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    console.error('❌ Invalid action:', action);
    res.status(400).json({ error: "Invalid action" });
  }
});

export default router;