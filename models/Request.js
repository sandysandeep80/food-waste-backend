const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Food"
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  status: {
    type: String,
    default: "pending"
  }
});

module.exports = mongoose.model("Request", requestSchema);