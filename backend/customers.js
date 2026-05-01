const express = require("express");
const router = express.Router();
const db = require("./db");

// GET /api/customers
router.get("/", (req, res) => {
  try {
    res.json({ success: true, data: db.getCustomers() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/customers
router.post("/", (req, res) => {
  const { name, email, company } = req.body;
  if (!name || !email)
    return res.status(400).json({ success: false, error: "name and email are required" });

  try {
    const customer = db.insertCustomer({ name, email, company });
    res.status(201).json({ success: true, data: customer });
  } catch (e) {
    if (e.message.includes("UNIQUE"))
      return res.status(409).json({ success: false, error: "Email already exists" });

    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/customers/:id
router.delete("/:id", (req, res) => {
  try {
    db.deleteCustomer(parseInt(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;