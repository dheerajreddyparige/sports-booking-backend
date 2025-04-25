const express = require('express');
const router = express.Router();

// Mock time slots (replace with real availability logic)
const timeSlots = {
  badminton: [
    { id: '10:00 AM', title: '10:00 AM' },
    { id: '11:00 AM', title: '11:00 AM' },
    { id: '12:00 PM', title: '12:00 PM' },
    { id: '1:00 PM', title: '1:00 PM' },
    { id: '2:00 PM', title: '2:00 PM' }
  ],
  cricket: [
    { id: '10:00 AM', title: '10:00 AM' },
    { id: '11:00 AM', title: '11:00 AM' },
    { id: '12:00 PM', title: '12:00 PM' },
    { id: '1:00 PM', title: '1:00 PM' },
    { id: '2:00 PM', title: '2:00 PM' }
  ]
};

router.get('/', (req, res) => {
  const { sport } = req.query;
  if (!sport || !timeSlots[sport]) {
    return res.status(400).json({ error: 'Invalid sport' });
  }
  res.json({ slots: timeSlots[sport] });
});

module.exports = router;