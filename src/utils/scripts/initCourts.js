import mongoose from "mongoose";
import Court from "../models/Court.js";

const initCourts = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const courts = [
    { sport: "badminton", courtId: 1, name: "Badminton Court 1", isActive: true },
    { sport: "badminton", courtId: 2, name: "Badminton Court 2", isActive: true },
    { sport: "badminton", courtId: 3, name: "Badminton Court 3", isActive: true },
    { sport: "badminton", courtId: 4, name: "Badminton Court 4", isActive: true },
    { sport: "badminton", courtId: 5, name: "Badminton Court 5", isActive: true },
    { sport: "cricket", courtId: 1, name: "Cricket Pitch", isActive: true },
    { sport: "pickleball", courtId: 1, name: "Pickleball Court", isActive: true },
  ];
  await Court.deleteMany({});
  await Court.insertMany(courts);
  console.log("Courts initialized");
  mongoose.connection.close();
};

initCourts();