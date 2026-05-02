const express = require("express");
const router = express.Router();
const db = require("./database"); // ✅ SQLite, not db.js

// GET /api/templates
router.get("/", (req, res) => {
  try {
    const data = db.prepare("SELECT * FROM templates ORDER BY id ASC").all();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/templates
router.post("/", (req, res) => {
  const { name, subject, body } = req.body;
  if (!name || !subject || !body) {
    return res.status(400).json({ success: false, error: "name, subject, and body are required" });
  }
  try {
    const result = db.prepare(`
      INSERT INTO templates (name, subject, body, created_at)
      VALUES (?, ?, ?, ?)
    `).run(name, subject, body, new Date().toISOString());
    res.status(201).json({ success: true, data: { id: result.lastInsertRowid, name, subject, body } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/templates/:id
router.delete("/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM templates WHERE id = ?").run(parseInt(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;