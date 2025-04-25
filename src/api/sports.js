const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const sports = [
    { id: 'badminton', title: 'Badminton (₹400)', color: '#00FF00' },
    { id: 'cricket', title: 'Cricket (₹600)', color: '#00FF00' }
  ];
  res.json({ sports });
});

module.exports = router;