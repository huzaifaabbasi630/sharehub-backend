const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Load environment variables
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Test Route
app.get("/", (req, res) => {
  res.json({ message: "Backend working on Vercel 🚀" });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// MongoDB connection (if using)
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));
}

// Import your existing routes
const roomRoutes = require("../src/routes/roomRoutes");
const messageRoutes = require("../src/routes/messageRoutes");

// Your existing routes
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);

// YAHAN app.listen NAHI likhna

module.exports = app;