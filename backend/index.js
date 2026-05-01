require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use("/api/customers", require("./customers"));
app.use("/api/templates", require("./templates"));
app.use("/api/broadcast", require("./broadcast"));

const db = require("./db");

// 🔥 UNSUBSCRIBE
app.get("/api/unsubscribe/:id", (req, res) => {
  const id = Number(req.params.id);

  const customer = db.getCustomerById(id);

  if (!customer) return res.status(404).send("User not found");

  db.updateCustomer(id, { subscribed: false });

  res.send("Unsubscribed successfully");
});

// 🔥 OPEN TRACKING
app.get("/api/track/open/:id", (req, res) => {
  const id = Number(req.params.id);

  db.get("send_log")
    .find({ customer_id: id })
    .assign({ opened: true })
    .write();

  const img = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z5wAAAABJRU5ErkJggg==",
    "base64"
  );

  res.set("Content-Type", "image/png");
  res.send(img);
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "..", "frontend", "dashboard.html"));
  }
});

require("./automation");

app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});