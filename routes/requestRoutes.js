const verifyToken = require("../middleware/authMiddleware");
const express = require("express");
const router = express.Router();
const Request = require("../models/Request");
const Food = require("../models/Food");

// Create request (NGO)
router.post("/", verifyToken, async (req, res) => {
  try {
    const newRequest = new Request({
      foodId: req.body.foodId,
      userId: req.user.id,   // 👈 VERY IMPORTANT
      status: "pending"
    });

    await newRequest.save();

    res.json({ message: "Request created successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
// Get all requests
router.get("/", verifyToken, async (req, res) => {
  try {
    const requests = await Request.find()
      .populate("userId", "username")
      .populate("foodId", "foodName");

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
// Approve request
router.put("/:id/approve", verifyToken, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    request.status = "approved";
    await request.save();
    res.json({ message: "Request approved" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
// Reject request
router.put("/:id/reject", verifyToken, async (req, res) => {
  await Request.findByIdAndUpdate(req.params.id, {
    status: "rejected"
  });
  res.json({ message: "Request rejected" });
});

module.exports = router;
// APPROVE
router.put("/:id/approve", async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = "approved";
    await request.save();

    res.json({ message: "Request approved" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// REJECT
router.put("/:id/reject", verifyToken, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    request.status = "rejected";
    await request.save();
    res.json({ message: "Request rejected" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});