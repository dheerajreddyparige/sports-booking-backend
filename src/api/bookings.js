const express = require("express");
const Booking = require("../models/Booking.js");
const { getAvailableSlots } = require("../utils/slotUtils.js");

const router = express.Router();

router.post("/create", async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    const order = await createRazorpayOrder(booking._id, booking.duration * 1000);
    res.json({ booking, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/slots", async (req, res) => {
  try {
    const { sport, date, duration } = req.query;
    if (!sport || !date || !duration) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    const slots = await getAvailableSlots(sport, date, duration);
    res.json({ slots });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;