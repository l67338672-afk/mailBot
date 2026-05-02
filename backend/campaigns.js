const express = require("express");
const router = express.Router();
const db = require("./database");

// GET all campaigns
router.get("/", (req, res) => {
  const campaigns = db
    .prepare("SELECT * FROM campaigns ORDER BY day_offset ASC")
    .all();
  res.json(campaigns);
});

// ADD campaign
router.post("/", (req, res) => {
  const { name, day_offset, subject, body } = req.body;

  if (!name || day_offset == null || !subject || !body) {
    return res.status(400).json({ error: "Missing fields" });
  }

  db.prepare(`
    INSERT INTO campaigns (name, day_offset, subject, body)
    VALUES (?, ?, ?, ?)
  `).run(name, day_offset, subject, body);

  res.json({ success: true });
});

// DELETE campaign
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM campaigns WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;