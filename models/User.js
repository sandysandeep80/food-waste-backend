const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ["admin", "ngo", "donor"],
    lowercase: true
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
