const express = require("express");
const router  = express.Router();
const db      = require("./database");

// GET /api/templates
router.get("/", async (req, res) => {
  try {
    const data = await db.query(
      "SELECT * FROM templates WHERE business_id = ? ORDER BY id ASC",
      [req.business.id]
    );
    res.json({ success: true, data });
  } catch (err) {
    console.error("Template fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch templates" });
  }
});

// POST /api/templates
router.post("/", async (req, res) => {
  try {
    const { name, subject, body } = req.body;
    if (!name || !subject || !body) {
      return res.status(400).json({ success: false, error: "name, subject, and body are required" });
    }

    const result = await db.execute(`
      INSERT INTO templates (business_id, name, subject, body, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [req.business.id, name, subject, body, new Date().toISOString()]);

    res.status(201).json({ success: true, data: { id: result.lastInsertRowid, name, subject, body } });
  } catch (err) {
    console.error("Template insert error:", err);
    res.status(500).json({ success: false, error: "Failed to add template" });
  }
});

// DELETE /api/templates/:id
router.delete("/:id", async (req, res) => {
  try {
    const result = await db.execute(
      "DELETE FROM templates WHERE id = ? AND business_id = ?",
      [parseInt(req.params.id), req.business.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: "Template not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Template delete error:", err);
    res.status(500).json({ success: false, error: "Failed to delete template" });
  }
});

module.exports = router;