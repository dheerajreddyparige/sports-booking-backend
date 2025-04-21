const express = require('express');
const cors = require('cors');
const connectToDatabase = require('./lib/connect-to-database');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize MongoDB connection
connectToDatabase()
  .then(() => console.log('MongoDB connection ready'))
  .catch(err => console.error('MongoDB connection failed:', err));

// Routes
app.use('/api/health', require('./api/health'));
app.use('/api/available-slots', require('./api/available-slots'));
app.use('/api/bookings', require('./api/bookings'));
app.use('/api/sports', require('./api/sports'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;