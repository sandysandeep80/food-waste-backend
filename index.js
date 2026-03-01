const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const foodRoutes = require("./routes/foodRoutes");
const requestRoutes = require("./routes/requestRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Route connections
app.use("/auth", authRoutes);
app.use("/foods", foodRoutes);
app.use("/requests", requestRoutes);

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/food_waste_db")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

app.listen(5000, () => {
  console.log("Server running on port 5000");
});