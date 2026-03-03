const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  const parts = storedPassword.split(":");

  // Backward compatibility for existing plaintext users.
  if (parts.length !== 2) {
    return password === storedPassword;
  }

  const [salt, storedHash] = parts;
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(storedHash, "hex")
  );
}

router.post("/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ message: "username, password and role are required" });
    }

    const normalizedRole = String(role).toLowerCase();
    if (!["admin", "ngo", "donor"].includes(normalizedRole)) {
      return res.status(400).json({ message: "role must be admin, ngo or donor" });
    }

    const normalizedUsername = String(username).trim();
    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = new User({
      username: normalizedUsername,
      password: hashPassword(password),
      role: normalizedRole
    });

    await newUser.save();
    res.json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }

    const normalizedUsername = String(username).trim();
    const user = await User.findOne({ username: normalizedUsername });
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT secret is not configured" });
    }

    // Upgrade legacy plaintext passwords on successful login.
    if (!user.password.includes(":")) {
      user.password = hashPassword(password);
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      role: user.role,
      token
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    if (!username || !newPassword) {
      return res.status(400).json({ message: "username and newPassword are required" });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "newPassword must be at least 6 characters" });
    }

    const normalizedUsername = String(username).trim();
    const user = await User.findOne({ username: normalizedUsername });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = hashPassword(String(newPassword));
    await user.save();

    res.json({ message: "Password reset successful. Please login with your new password." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
