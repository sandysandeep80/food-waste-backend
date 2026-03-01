let currentUserRole = "";

// ================= LOGIN =================
function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  fetch("http://localhost:5000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.role) {
      currentUserRole = data.role;

      alert("Login successful as " + data.role);
      localStorage.setItem("token", data.token);

      // Hide Add Food for NGO
      if (data.role === "ngo") {
        document.getElementById("addFoodSection").style.display = "none";
      } else {
        document.getElementById("addFoodSection").style.display = "block";
      }

      loadFoods();
      loadRequests();
    } else {
      alert(data.message);
    }
  })
  .catch(err => console.log(err));
}

// ================= ADD FOOD (ADMIN ONLY) =================
function addFood() {
  const foodName = document.getElementById("foodName").value;
  const quantity = document.getElementById("quantity").value;
  const location = document.getElementById("location").value;

  fetch("http://localhost:5000/foods", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": localStorage.getItem("token")
  },
  body: JSON.stringify({ foodName, quantity, location })
})
  .then(res => res.json())
  .then(() => {
    loadFoods();
  });
}

// ================= LOAD FOODS =================
function loadFoods() {
  fetch("http://localhost:5000/foods")
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById("foodList");
    list.innerHTML = "";

    data.forEach(food => {
      const li = document.createElement("li");

      li.innerHTML = `
        ${food.foodName} - ${food.quantity} - ${food.location}
        ${currentUserRole === "ngo" 
          ? `<button onclick="requestFood('${food._id}')">Request</button>` 
          : ""}
      `;

      list.appendChild(li);
    });
  });
}

// ================= SEND REQUEST (NGO) =================
function requestFood(foodId) {
  fetch("http://localhost:5000/requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": localStorage.getItem("token")
    },
    body: JSON.stringify({ foodId })
  })
  .then(res => res.json())
  .then(data => {
    console.log("Request response:", data);
    alert("Request Sent");
    loadRequests();
  })
  .catch(err => console.log(err));
}
// ================= LOAD REQUESTS =================

function loadRequests() {
  fetch("http://localhost:5000/requests", {
    headers: {
      "Authorization": localStorage.getItem("token")
    }
  })
  .then(res => res.json())
  .then(data => {

    const requestList = document.getElementById("requestList");
    requestList.innerHTML = "";

    data.forEach(req => {

      const li = document.createElement("li");

      li.innerHTML = `
        <strong>Food:</strong> ${req.foodId?.foodName || "Deleted"} <br>
        <strong>NGO:</strong> ${req.userId?.username || "Unknown"} <br>
        <strong>Status:</strong> ${req.status} <br>
        <button onclick="approveRequest('${req._id}')">Approve</button>
        <button onclick="rejectRequest('${req._id}')">Reject</button>
        <hr>
      `;

      requestList.appendChild(li);
    });
  });
}
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "index.html";
}
<button onclick="logout()">Logout</button>
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
