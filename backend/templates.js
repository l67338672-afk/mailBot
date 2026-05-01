const express = require("express");
const router = express.Router();
const db = require("./db");

// 🔥 DEFAULT HIGH-CONVERTING TEMPLATE (auto seed)
function seedTemplatesIfEmpty() {
  const existing = db.getTemplates();
  if (existing.length === 0) {
    db.insertTemplate({
      name: "Salon Re-engagement Offer",
      subject: "Hey {{name}}, we saved you something 🎁",
      body: `Hey {{name}} 👋

It’s been a while since your last visit at {{company}}.

We’ve got something special for you:
👉 20% OFF on your next visit

⏳ Valid for next 3 days only

Reply YES to book your slot.

– {{company}}`,
    });

    db.insertTemplate({
      name: "Quick Comeback Offer",
      subject: "{{name}}, don’t miss this 👀",
      body: `Hi {{name}},

You visited {{company}} before — we’d love to see you again.

Here’s a limited-time offer just for you:
👉 Flat 20% OFF

Only valid for 72 hours.

Book now or reply YES.

– {{company}}`,
    });

    console.log("✅ Default templates seeded");
  }
}

// Run seed
seedTemplatesIfEmpty();


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