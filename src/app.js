const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL, // your Next.js frontend URL
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoutes);

// Health Check
app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});

module.exports = app;
