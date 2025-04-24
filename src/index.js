const express = require('express');
const cors = require('cors');
const connectToDatabase = require('./util/connect-to-database');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize MongoDB connection
connectToDatabase()
  .then(() => console.log('MongoDB connection ready'))
  .catch(err => console.error('MongoDB connection failed:', err));

// Routes
app.use('/api/health', require('../src/api/health'));
app.use('/api/available-slots', require('../src/api/available-slots'));
app.use('/api/bookings', require('../src/api/bookings'));
app.use('/api/sports', require('../src/api/sports'));
app.use('/', require('../src/controllers/flowscontroller'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;