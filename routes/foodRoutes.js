
const verifyToken = require("../middleware/authMiddleware");
const express = require("express");
const router = express.Router();
const Food = require("../models/Food");

// ADD FOOD
router.post("/", verifyToken, async (req, res) => {
  const { foodName, quantity, location } = req.body;

  const food = new Food({ foodName, quantity, location });
  await food.save();

  res.json({ message: "Food added successfully" });
});

// GET FOOD
router.get("/", async (req, res) => {
  const foods = await Food.find();
  res.json(foods);
});

module.exports = router;