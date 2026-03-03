const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const requireRoles = require("../middleware/roleMiddleware");
const Food = require("../models/Food");

const router = express.Router();

router.post("/", verifyToken, requireRoles("admin", "donor"), async (req, res) => {
  try {
    const { foodName, quantity, location, category, contactName, contactNumber } = req.body;
    if (!foodName || !quantity || !location || !contactName || !contactNumber) {
      return res.status(400).json({
        message: "foodName, quantity, location, contactName and contactNumber are required"
      });
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({ message: "quantity must be a positive number" });
    }

    const normalizedContact = String(contactNumber).replace(/\D/g, "");
    if (normalizedContact.length < 10 || normalizedContact.length > 15) {
      return res.status(400).json({ message: "contactNumber must be 10 to 15 digits" });
    }

    const food = new Food({
      foodName,
      quantity: parsedQuantity,
      location,
      contactName: String(contactName).trim(),
      contactNumber: normalizedContact,
      category
    });

    await food.save();
    res.status(201).json({ message: "Food added successfully", food });
  } catch (err) {
    if (err.name === "ValidationError") {
      const firstIssue = Object.values(err.errors || {})[0];
      return res.status(400).json({ message: firstIssue?.message || "Invalid food data" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { q, location, minQuantity, category } = req.query;
    const filter = {};

    if (q) {
      filter.foodName = { $regex: q, $options: "i" };
    }

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    if (category) {
      filter.category = category;
    }

    if (minQuantity) {
      const parsedMinQuantity = Number(minQuantity);
      if (Number.isFinite(parsedMinQuantity)) {
        filter.quantity = { $gte: parsedMinQuantity };
      }
    }

    const foods = await Food.find(filter).sort({ createdAt: -1 });
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/insights", verifyToken, async (req, res) => {
  try {
    const [totals] = await Food.aggregate([
      {
        $group: {
          _id: null,
          totalFoods: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" }
        }
      }
    ]);

    const byLocation = await Food.aggregate([
      {
        $group: {
          _id: "$location",
          items: { $sum: 1 },
          quantity: { $sum: "$quantity" }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 }
    ]);

    const byCategory = await Food.aggregate([
      {
        $group: {
          _id: "$category",
          items: { $sum: 1 }
        }
      },
      { $sort: { items: -1 } }
    ]);

    const lowStockCount = await Food.countDocuments({ quantity: { $lt: 5 } });
    const recentCount = await Food.countDocuments({
      createdAt: { $gte: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)) }
    });

    res.json({
      totalFoods: totals?.totalFoods || 0,
      totalQuantity: totals?.totalQuantity || 0,
      lowStockCount,
      recentCount,
      byLocation,
      byCategory
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", verifyToken, requireRoles("admin", "donor"), async (req, res) => {
  try {
    const deletedFood = await Food.findByIdAndDelete(req.params.id);
    if (!deletedFood) {
      return res.status(404).json({ message: "Food listing not found" });
    }
    res.json({ message: "Food deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
