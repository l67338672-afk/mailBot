const express = require("express");
const router = express.Router();
const db = require("./db");

// GET /api/templates
router.get("/", (req, res) => {
  try {
    res.json({ success: true, data: db.getTemplates() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/templates
router.post("/", (req, res) => {
  const { name, subject, body } = req.body;

  if (!name || !subject || !body) {
    return res.status(400).json({
      success: false,
      error: "name, subject, and body are required",
    });
  }

  try {
    const template = db.insertTemplate({ name, subject, body });
    res.status(201).json({ success: true, data: template });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/templates/:id
router.delete("/:id", (req, res) => {
  try {
    db.deleteTemplate(parseInt(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;