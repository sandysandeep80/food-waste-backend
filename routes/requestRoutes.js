const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const requireRoles = require("../middleware/roleMiddleware");
const Request = require("../models/Request");
const Food = require("../models/Food");

const router = express.Router();

router.post("/", verifyToken, requireRoles("ngo"), async (req, res) => {
  try {
    const { foodId } = req.body;
    if (!foodId) {
      return res.status(400).json({ message: "foodId is required" });
    }

    const food = await Food.findById(foodId);
    if (!food) {
      return res.status(404).json({ message: "Food not found" });
    }

    const existingPending = await Request.findOne({
      foodId,
      userId: req.user.id,
      status: "pending"
    });

    if (existingPending) {
      return res.status(409).json({ message: "Pending request already exists for this food" });
    }

    const newRequest = new Request({
      foodId,
      userId: req.user.id,
      status: "pending"
    });

    await newRequest.save();
    res.status(201).json({ message: "Request created successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", verifyToken, async (req, res) => {
  try {
    const filter = req.user.role === "ngo" ? { userId: req.user.id } : {};
    const requests = await Request.find(filter)
      .populate("userId", "username")
      .populate("foodId", "foodName quantity location contactName contactNumber category")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/approve", verifyToken, requireRoles("admin"), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(409).json({ message: `Cannot approve a ${request.status} request` });
    }

    request.status = "approved";
    await request.save();
    res.json({ message: "Request approved" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/reject", verifyToken, requireRoles("admin"), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(409).json({ message: `Cannot reject a ${request.status} request` });
    }

    request.status = "rejected";
    await request.save();
    res.json({ message: "Request rejected" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
