require("dotenv").config();

const express = require("express");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "frontend")));

// ROUTES
app.use("/api/customers", require("./customers"));
app.use("/api/templates", require("./templates"));
app.use("/api/broadcast", require("./broadcast"));
app.use("/api/campaigns", require("./campaigns")); // ✅ campaigns added

// Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Serve frontend
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "..", "frontend", "dashboard.html"));
  }
});

const PORT = process.env.PORT || 10000;

// 🔥 AUTOMATION (NON-BLOCKING + REPEATING)
const runAutomation = require("./automation");

// first run after startup
setTimeout(() => {
  try {
    runAutomation();
  } catch (e) {
    console.error("Automation error:", e.message);
  }
}, 2000);

// repeat every 1 minute
setInterval(() => {
  try {
    runAutomation();
  } catch (e) {
    console.error("Automation error:", e.message);
  }
}, 60000);

app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});