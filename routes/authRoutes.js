const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");


// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = new User({
      username,
      password,
      role
    });

    await newUser.save();

    res.json({ message: "User registered successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username, password });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 🔥 Create JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      "secretkey",
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      role: user.role,
      token: token
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;