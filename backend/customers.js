const express = require("express");
const router = express.Router();
const db = require("./database");

// GET all customers
router.get("/", (req, res) => {
  const customers = db.prepare("SELECT * FROM customers ORDER BY id DESC").all();
  res.json(customers);
});

// ADD new customer (FIXED with created_at)
router.post("/", (req, res) => {
  const { name, email, company } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Missing fields" });
  }

  db.prepare(`
    INSERT INTO customers (name, email, company, created_at)
    VALUES (?, ?, ?, ?)
  `).run(name, email, company || "", new Date().toISOString());

  res.json({ success: true });
});

// DELETE customer
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;