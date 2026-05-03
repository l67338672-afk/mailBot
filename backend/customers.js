const express = require("express");
const router  = express.Router();
const db      = require("./database");

// GET /api/customers
router.get("/", async (req, res) => {
  try {
    const customers = await db.query(
      "SELECT * FROM customers WHERE business_id = ? ORDER BY created_at DESC",
      [req.business.id]
    );
    res.json({ success: true, data: customers });
  } catch (err) {
    console.error("Customer fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch customers" });
  }
});

// POST /api/customers
router.post("/", async (req, res) => {
  try {
    const { name, email, company, business_name, business_email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: "Missing name or email" });
    }

    const result = await db.execute(`
      INSERT INTO customers (business_id, name, email, company, business_name, business_email, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      req.business.id,
      name,
      email,
      company        || "",
      business_name  || company || "",
      business_email || "",
      new Date().toISOString()
    ]);

    console.log(`✅ Customer added [biz ${req.business.id}]:`, email, "→ id", result.lastInsertRowid);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ INSERT ERROR:", err);
    res.status(500).json({ success: false, error: "Insert failed" });
  }
});

// DELETE /api/customers/:id
router.delete("/:id", async (req, res) => {
  try {
    const result = await db.execute(
      "DELETE FROM customers WHERE id = ? AND business_id = ?",
      [req.params.id, req.business.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: "Customer not found" });
    }

    console.log(`🗑️ Customer deleted [biz ${req.business.id}]: id=${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    console.error("Customer delete error:", err);
    res.status(500).json({ success: false, error: "Failed to delete customer" });
  }
});

module.exports = router;