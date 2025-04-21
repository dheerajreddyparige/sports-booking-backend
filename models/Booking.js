const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  sport: {
    type: String,
    required: true,
    enum: ['badminton', 'cricket']
  },
  time_slot: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50
  },
  phone: {
    type: String,
    required: true,
    match: /^[0-9]{10}$/
  },
  email: {
    type: String,
    required: true,
    match: /.+\@.+\..+/
  },
  price: {
    type: Number,
    required: true,
    enum: [400, 600]
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', bookingSchema);