// src/util/scripts/initDb.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectToDatabase = require('../connect-to-database');

// Import models
const Court = require('../../models/Court').default;

/**
 * Initialize database with sample courts data
 */
async function initializeDatabase() {
  try {
    // Connect to database
    await connectToDatabase();
    console.log('Connected to database');
    
    // Check if courts already exist
    const existingCourts = await Court.countDocuments();
    if (existingCourts > 0) {
      console.log(`Database already contains ${existingCourts} courts. Skipping initialization.`);
      return;
    }
    
    // Sample courts data
    const courtsData = [
      { sport: 'badminton', courtId: 1, name: 'Badminton Court 1', isActive: true },
      { sport: 'badminton', courtId: 2, name: 'Badminton Court 2', isActive: true },
      { sport: 'badminton', courtId: 3, name: 'Badminton Court 3', isActive: true },
      { sport: 'badminton', courtId: 4, name: 'Badminton Court 4', isActive: true },
      { sport: 'badminton', courtId: 5, name: 'Badminton Court 5', isActive: true },
      { sport: 'cricket', courtId: 1, name: 'Cricket Ground', isActive: true },
      { sport: 'pickleball', courtId: 1, name: 'Pickleball Court', isActive: true },
    ];
    
    // Insert courts data
    await Court.insertMany(courtsData);
    console.log(`Successfully inserted ${courtsData.length} courts into the database.`);
    
    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    // Close the connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('Database connection closed.');
    }
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Initialization failed:', error);
      process.exit(1);
    });
}

module.exports = initializeDatabase;