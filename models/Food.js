const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema({
  foodName: String,
  quantity: Number,
  location: String
});

module.exports = mongoose.model("Food", foodSchema);