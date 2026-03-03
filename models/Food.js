const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema({
  foodName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  contactName: {
    type: String,
    trim: true,
    default: ""
  },
  contactNumber: {
    type: String,
    trim: true,
    default: ""
  },
  category: {
    type: String,
    enum: ["veg", "non-veg", "mixed", "bakery", "packaged"],
    default: "mixed"
  }
}, { timestamps: true });

// Auto-remove food listings 24 hours after creation.
foodSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.model("Food", foodSchema);
