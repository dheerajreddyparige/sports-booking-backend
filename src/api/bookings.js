const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');

router.post('/', async (req, res) => {
  const { sport, time_slot, name, phone, email, price } = req.body;

  // Server-side validation
  if (!sport || !['badminton', 'cricket'].includes(sport)) {
    return res.status(400).json({ error: 'Invalid sport' });
  }
  if (!time_slot) {
    return res.status(400).json({ error: 'Invalid time slot' });
  }
  if (!name || name.length < 2 || name.length > 50) {
    return res.status(400).json({ error: 'Name must be 2-50 characters' });
  }
  if (!phone || !/^[0-9]{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Phone must be 10 digits' });
  }
  if (!email || !/.+\@.+\..+/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (!price || ![400, 600].includes(Number(price))) {
    return res.status(400).json({ error: 'Invalid price' });
  }

  try {
    const booking = new Booking({ sport, time_slot, name, phone, email, price });
    await booking.save();
    res.json({ message: 'Booking saved', booking_id: booking._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save booking' });
  }
});

module.exports = router;