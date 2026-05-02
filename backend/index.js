require("dotenv").config();

const express = require("express");
const path = require("path");
const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Routes
app.use("/api/customers", require("./customers"));
app.use("/api/templates", require("./templates"));
app.use("/api/broadcast", require("./broadcast"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Serve dashboard (fallback)
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "..", "frontend", "dashboard.html"));
  }
});

const PORT = process.env.PORT || 10000;

// ✅ START SERVER FIRST → THEN AUTOMATION
app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);

  // 🔥 START AUTOMATION CLEANLY
  const runAutomation = require("./automation");
  runAutomation();
});