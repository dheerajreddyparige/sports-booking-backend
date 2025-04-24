import express from "express";
import { SCREEN_RESPONSES } from "../constants.js";
import { getAvailableSlots, saveFlowState, getFlowState } from "../utils/slotUtils.js";

const router = express.Router();

const updateScreenState = async (screen, data, flowToken) => {
  switch (screen) {
    case "APPOINTMENT":
      const availableDurations = data.department
        ? SCREEN_RESPONSES.APPOINTMENT.data.location.filter((duration) => {
            if (data.department === "cricket") {
              return ["2hr", "3hr", "4hr"].includes(duration.id);
            }
            return ["1hr", "1.5hr", "2hr"].includes(duration.id);
          })
        : SCREEN_RESPONSES.APPOINTMENT.data.location;

      const availableDates = data.department && data.location
        ? SCREEN_RESPONSES.APPOINTMENT.data.date
        : SCREEN_RESPONSES.APPOINTMENT.data.date;

      const availableTimes = data.department && data.location && data.date
        ? await getAvailableSlots(data.department, data.date, data.location)
        : SCREEN_RESPONSES.APPOINTMENT.data.time;

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

      await saveFlowState(flowToken, screen, response.data.selected);
      return response;

    default:
      return SCREEN_RESPONSES[screen] || {};
  }
};

router.post("/flows", async (req, res) => {
  const { action, data } = req.body;

  if (action === "ping") {
    res.json({ status: "active" });
  } else if (action === "data_exchange") {
    try {
      const { flow_token, screen, ...userData } = data || {};
      const flowState = await getFlowState(flow_token);
      const mergedData = { ...flowState.data, ...userData };
      const response = await updateScreenState(screen || flowState.screen, mergedData, flow_token);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Invalid action" });
  }
});

export default router;