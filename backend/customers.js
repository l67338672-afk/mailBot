const express = require("express");
const router = express.Router();
const db = require("./database");

// ---------------- GET ALL CUSTOMERS ----------------
router.get("/", (req, res) => {
  try {
    const customers = db.prepare("SELECT * FROM customers").all();
    res.json({ success: true, data: customers });
  } catch (err) {
    console.error("Customer fetch error:", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// ---------------- ADD CUSTOMER ----------------
router.post("/", (req, res) => {
  try {
    const { name, email, company, business_name, business_email } = req.body;

    console.log("🔥 ADD REQUEST:", name, email, company, business_name, business_email);

    if (!name || !email) {
      return res.status(400).json({ error: "Missing name or email" });
    }

    const result = db.prepare(`
      INSERT INTO customers (name, email, company, business_name, business_email, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      name,
      email,
      company        || "",
      business_name  || company || "",
      business_email || "",
      new Date().toISOString()
    );

    console.log("✅ INSERT RESULT:", result);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ INSERT ERROR:", err);
    res.status(500).json({ error: "Insert failed" });
  }
});

// ---------------- DELETE CUSTOMER ----------------
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;

    const result = db
      .prepare("DELETE FROM customers WHERE id = ?")
      .run(id);

    console.log("🗑️ DELETE RESULT:", result);

    res.json({ success: true });
  } catch (err) {
    console.error("Customer delete error:", err);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

module.exports = router;