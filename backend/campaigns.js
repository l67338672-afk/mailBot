const express = require("express");
const router  = express.Router();
const db      = require("./database");

// GET /api/campaigns
router.get("/", (req, res) => {
  try {
    const campaigns = db.prepare(
      "SELECT * FROM campaigns WHERE business_id = ? ORDER BY day_offset ASC"
    ).all(req.business.id);
    res.json(campaigns);
  } catch (err) {
    console.error("Campaign fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch campaigns" });
  }
});

// POST /api/campaigns
router.post("/", (req, res) => {
  try {
    const { name, day_offset, subject, body } = req.body;
    if (!name || day_offset == null || !subject || !body) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    db.prepare(`
      INSERT INTO campaigns (business_id, name, day_offset, subject, body)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.business.id, name, Number(day_offset), subject, body);

    res.json({ success: true });
  } catch (err) {
    console.error("Campaign insert error:", err);
    res.status(500).json({ success: false, error: "Failed to add campaign" });
  }
});

// DELETE /api/campaigns/:id
router.delete("/:id", (req, res) => {
  try {
    const result = db.prepare(
      "DELETE FROM campaigns WHERE id = ? AND business_id = ?"
    ).run(req.params.id, req.business.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: "Campaign not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Campaign delete error:", err);
    res.status(500).json({ success: false, error: "Failed to delete campaign" });
  }
});

module.exports = router;