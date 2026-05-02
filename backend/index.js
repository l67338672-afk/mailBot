const express = require("express");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const db = require("./db");

// APIs
app.get("/api/customers", (req, res) => {
  res.json(db.getCustomers());
});

app.post("/api/customers", (req, res) => {
  db.addCustomer(req.body);
  res.json({ success: true });
});

app.delete("/api/customers/:id", (req, res) => {
  db.deleteCustomer(Number(req.params.id));
  res.json({ success: true });
});

app.get("/api/templates", (req, res) => {
  res.json(db.getTemplates());
});

// broadcast route
app.use("/api/broadcast", require("./broadcast"));

// serve dashboard
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dashboard.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});