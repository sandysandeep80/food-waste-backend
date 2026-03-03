const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

const authRoutes = require("../routes/authRoutes");
const foodRoutes = require("../routes/foodRoutes");
const requestRoutes = require("../routes/requestRoutes");
const User = require("../models/User");
const Food = require("../models/Food");
const Request = require("../models/Request");

let users = [];
let foods = [];
let requests = [];

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRoutes);
  app.use("/foods", foodRoutes);
  app.use("/requests", requestRoutes);
  return app;
}

async function withServer(run) {
  const app = buildApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function token(role, id) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

function regexFromFilter(regexOrString, options) {
  if (regexOrString instanceof RegExp) return regexOrString;
  return new RegExp(regexOrString, options || "");
}

function patchModels() {
  User.findOne = async ({ username }) => {
    const user = users.find((u) => u.username === username);
    return user || null;
  };

  User.prototype.save = async function saveUser() {
    const existingIndex = users.findIndex((u) => u.username === this.username);
    const userObj = {
      _id: this._id ? String(this._id) : `user_${users.length + 1}`,
      username: this.username,
      password: this.password,
      role: this.role
    };
    this._id = userObj._id;

    if (existingIndex >= 0) {
      users[existingIndex] = userObj;
    } else {
      users.push(userObj);
    }
  };

  Food.prototype.save = async function saveFood() {
    const foodObj = {
      _id: this._id ? String(this._id) : `food_${foods.length + 1}`,
      foodName: this.foodName,
      quantity: this.quantity,
      location: this.location,
      category: this.category || "mixed",
      createdAt: this.createdAt || new Date()
    };
    this._id = foodObj._id;
    foods.push(foodObj);
  };

  Food.findById = async (id) => foods.find((f) => String(f._id) === String(id)) || null;

  Food.find = (filter = {}) => ({
    sort: async () => foods
      .filter((food) => {
        if (filter.foodName) {
          const rx = regexFromFilter(filter.foodName.$regex, filter.foodName.$options);
          if (!rx.test(food.foodName)) return false;
        }
        if (filter.location) {
          const rx = regexFromFilter(filter.location.$regex, filter.location.$options);
          if (!rx.test(food.location)) return false;
        }
        if (filter.category && food.category !== filter.category) return false;
        if (filter.quantity && food.quantity < filter.quantity.$gte) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  });

  Food.aggregate = async (pipeline) => {
    const groupStage = pipeline.find((step) => step.$group);
    const group = groupStage?.$group || {};

    if (group.totalFoods) {
      return [{
        totalFoods: foods.length,
        totalQuantity: foods.reduce((sum, food) => sum + Number(food.quantity || 0), 0)
      }];
    }

    if (group._id === "$location") {
      const map = new Map();
      foods.forEach((food) => {
        const current = map.get(food.location) || { _id: food.location, items: 0, quantity: 0 };
        current.items += 1;
        current.quantity += Number(food.quantity || 0);
        map.set(food.location, current);
      });
      return Array.from(map.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    }

    if (group._id === "$category") {
      const map = new Map();
      foods.forEach((food) => {
        const key = food.category || "mixed";
        map.set(key, (map.get(key) || 0) + 1);
      });
      return Array.from(map.entries())
        .map(([key, value]) => ({ _id: key, items: value }))
        .sort((a, b) => b.items - a.items);
    }

    return [];
  };

  Food.countDocuments = async (filter = {}) => {
    if (filter.quantity && filter.quantity.$lt !== undefined) {
      return foods.filter((f) => f.quantity < filter.quantity.$lt).length;
    }
    if (filter.createdAt && filter.createdAt.$gte) {
      return foods.filter((f) => new Date(f.createdAt) >= filter.createdAt.$gte).length;
    }
    return foods.length;
  };

  Request.findOne = async (filter = {}) =>
    requests.find((r) =>
      String(r.foodId) === String(filter.foodId) &&
      String(r.userId) === String(filter.userId) &&
      r.status === filter.status
    ) || null;

  Request.prototype.save = async function saveRequest() {
    const requestObj = {
      _id: this._id ? String(this._id) : `request_${requests.length + 1}`,
      foodId: String(this.foodId),
      userId: String(this.userId),
      status: this.status || "pending",
      createdAt: this.createdAt || new Date()
    };
    this._id = requestObj._id;
    requests.push(requestObj);
  };

  Request.find = (filter = {}) => {
    const query = {
      populate() {
        return query;
      },
      async sort() {
        return requests
          .filter((request) => {
            if (filter.userId && String(request.userId) !== String(filter.userId)) return false;
            return true;
          })
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map((request) => {
            const user = users.find((u) => String(u._id) === String(request.userId));
            const food = foods.find((f) => String(f._id) === String(request.foodId));
            return {
              _id: request._id,
              status: request.status,
              createdAt: request.createdAt,
              userId: user ? { _id: user._id, username: user.username } : null,
              foodId: food
                ? {
                    _id: food._id,
                    foodName: food.foodName,
                    quantity: food.quantity,
                    location: food.location,
                    category: food.category
                  }
                : null
            };
          });
      }
    };
    return query;
  };

  Request.findById = async (id) => {
    const current = requests.find((r) => String(r._id) === String(id));
    if (!current) return null;
    return {
      ...current,
      async save() {
        const index = requests.findIndex((r) => String(r._id) === String(current._id));
        requests[index] = {
          ...requests[index],
          status: this.status
        };
      }
    };
  };
}

test.beforeEach(() => {
  process.env.JWT_SECRET = "test-secret";
  users = [];
  foods = [];
  requests = [];
  patchModels();
});

test("auth register and login", async () => {
  await withServer(async (baseUrl) => {
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin1", password: "pass123", role: "admin" })
    });
    assert.equal(registerResponse.status, 200);
    assert.equal(users.length, 1);
    assert.ok(users[0].password.includes(":"));
    assert.notEqual(users[0].password, "pass123");

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin1", password: "pass123" })
    });
    assert.equal(loginResponse.status, 200);
    const loginData = await loginResponse.json();
    assert.equal(loginData.role, "admin");
    assert.ok(loginData.token);
  });
});

test("role checks and food listing filters", async () => {
  await withServer(async (baseUrl) => {
    const ngoToken = token("ngo", "ngo_1");
    const donorToken = token("donor", "donor_1");

    const forbiddenPost = await fetch(`${baseUrl}/foods`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ngoToken}`
      },
      body: JSON.stringify({
        foodName: "Rice",
        quantity: 10,
        location: "Delhi",
        contactName: "Donor A",
        contactNumber: "9876543210",
        category: "veg"
      })
    });
    assert.equal(forbiddenPost.status, 403);

    const allowedPost = await fetch(`${baseUrl}/foods`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        foodName: "Rice Bowl",
        quantity: 10,
        location: "Delhi",
        contactName: "Donor B",
        contactNumber: "9123456789",
        category: "veg"
      })
    });
    assert.equal(allowedPost.status, 201);

    foods.push({
      _id: "food_2",
      foodName: "Bread Pack",
      quantity: 2,
      location: "Mumbai",
      category: "bakery",
      createdAt: new Date()
    });

    const filtered = await fetch(
      `${baseUrl}/foods?q=Rice&location=Del&minQuantity=5&category=veg`
    );
    assert.equal(filtered.status, 200);
    const filteredData = await filtered.json();
    assert.equal(filteredData.length, 1);
    assert.equal(filteredData[0].foodName, "Rice Bowl");
  });
});

test("food insights endpoint returns aggregates", async () => {
  await withServer(async (baseUrl) => {
    foods = [
      {
        _id: "food_1",
        foodName: "Rice",
        quantity: 8,
        location: "Delhi",
        category: "veg",
        createdAt: new Date()
      },
      {
        _id: "food_2",
        foodName: "Bread",
        quantity: 3,
        location: "Delhi",
        category: "bakery",
        createdAt: new Date()
      },
      {
        _id: "food_3",
        foodName: "Meal Box",
        quantity: 12,
        location: "Noida",
        category: "mixed",
        createdAt: new Date()
      }
    ];

    const adminToken = token("admin", "admin_1");
    const response = await fetch(`${baseUrl}/foods/insights`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.totalFoods, 3);
    assert.equal(data.totalQuantity, 23);
    assert.equal(data.lowStockCount, 1);
    assert.ok(Array.isArray(data.byLocation));
    assert.ok(Array.isArray(data.byCategory));
  });
});

test("request lifecycle and role-scoped request list", async () => {
  await withServer(async (baseUrl) => {
    const ngo1Id = "64d2f4e5a9b8c7d6e5f4a301";
    const ngo2Id = "64d2f4e5a9b8c7d6e5f4a302";
    const adminId = "64d2f4e5a9b8c7d6e5f4a303";
    const foodId = "64d2f4e5a9b8c7d6e5f4a304";

    users = [
      { _id: ngo1Id, username: "ngoA", password: "x:y", role: "ngo" },
      { _id: ngo2Id, username: "ngoB", password: "x:y", role: "ngo" }
    ];
    foods = [
      {
        _id: foodId,
        foodName: "Rice Kit",
        quantity: 7,
        location: "Pune",
        category: "veg",
        createdAt: new Date()
      }
    ];

    const ngoToken = token("ngo", ngo1Id);
    const adminToken = token("admin", adminId);

    const createRequest = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ngoToken}`
      },
      body: JSON.stringify({ foodId })
    });
    assert.equal(createRequest.status, 201);

    const duplicateRequest = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ngoToken}`
      },
      body: JSON.stringify({ foodId })
    });
    assert.equal(duplicateRequest.status, 409);

    const firstRequestId = requests[0]._id;

    requests.push({
      _id: "64d2f4e5a9b8c7d6e5f4a400",
      foodId,
      userId: ngo2Id,
      status: "pending",
      createdAt: new Date()
    });

    const scopedList = await fetch(`${baseUrl}/requests`, {
      headers: { Authorization: `Bearer ${ngoToken}` }
    });
    assert.equal(scopedList.status, 200);
    const scopedData = await scopedList.json();
    assert.equal(scopedData.length, 1);
    assert.equal(scopedData[0].userId.username, "ngoA");

    const approve = await fetch(`${baseUrl}/requests/${firstRequestId}/approve`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(approve.status, 200);

    const approveAgain = await fetch(`${baseUrl}/requests/${firstRequestId}/approve`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(approveAgain.status, 409);
  });
});
