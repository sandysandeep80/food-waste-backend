require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");


const rateLimit = require("./middleware/rateLimitMiddleware");
const { requestMonitor, getStats } = require("./middleware/requestMonitorMiddleware");
const authRoutes = require("./routes/authRoutes");
const foodRoutes = require("./routes/foodRoutes");
const requestRoutes = require("./routes/requestRoutes");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = allowedOrigins.length
  ? {
      origin(origin, callback) {
        // Allow no-origin (server-to-server), local file origin ("null"), and configured frontend origins.
        if (!origin || origin === "null" || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      }
    }
  : { origin: true };

app.use(cors(corsOptions));
app.use(express.json());
app.use(requestMonitor);
app.use(rateLimit);

app.use("/auth", authRoutes);
app.use("/foods", foodRoutes);
app.use("/requests", requestRoutes);

app.get("/", (req, res) => {
  res.send("Food Waste Backend is Running");
});

app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const database = dbState === 1 ? "connected" : "disconnected";
  res.json({
    status: "ok",
    database,
    timestamp: new Date().toISOString()
  });
});

app.get("/monitoring", (req, res) => {
  res.json(getStats());
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
