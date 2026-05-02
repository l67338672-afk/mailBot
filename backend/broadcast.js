const express = require("express");
const router = express.Router();
const db = require("./database"); 

function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
}

// POST /api/broadcast
router.post("/", async (req, res) => {
  try {
    const { templateId, customerIds } = req.body;

    if (!templateId) {
      return res.status(400).json({ success: false, error: "templateId required" });
    }

    const template = db.prepare("SELECT * FROM templates WHERE id = ?").get(Number(templateId));
    if (!template) {
      return res.status(404).json({ success: false, error: "Template not found" });
    }

    const allCustomers = db.prepare("SELECT * FROM customers").all();

    const targets =
      Array.isArray(customerIds) && customerIds.length > 0
        ? allCustomers.filter(c => customerIds.map(Number).includes(c.id))
        : allCustomers;

    if (targets.length === 0) {
      return res.status(400).json({ success: false, error: "No customers found" });
    }

    const API_KEY = process.env.BREVO_API_KEY;

    // No API key = preview mode
    if (!API_KEY) {
      const previewResults = targets.map(c => ({ email: c.email, status: "preview" }));
      return res.json({
        success: true,
        preview: true,
        summary: { total: previewResults.length, sent: 0, failed: 0 },
        results: previewResults,
      });
    }

    // Real sending via Brevo API
    const results = [];

    for (const customer of targets) {
      const vars = {
        name: customer.name,
        email: customer.email,
        company: customer.company || "",
      };

      const subject = interpolate(template.subject, vars);
      const body = interpolate(template.body, vars);

      console.log("📤 Sending to:", customer.email);

      try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": API_KEY,
          },
          body: JSON.stringify({
            sender: {
              name: process.env.FROM_NAME || "MailBot",
              email: process.env.FROM_EMAIL,
            },
            to: [{ email: customer.email }],
            subject,
            textContent: body,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `Brevo API error ${response.status}`);
        }

        console.log("✅ Sent to:", customer.email);

        db.logSend({
          customer_id: customer.id,
          template_id: template.id,
          status: "sent",
        });

        results.push({ email: customer.email, status: "sent" });

      } catch (err) {
        console.error("❌ Failed:", customer.email, err.message);

        db.prepare(`
  INSERT INTO send_logs (customer_id, template_id, status, sent_at)
  VALUES (?, ?, ?, ?)
`).run(customer.id, template.id, "sent", new Date().toISOString());
// use "failed" in the catch block

        results.push({
          email: customer.email,
          status: "failed",
          error: err.message,
        });
      }
    }

    return res.json({
      success: true,
      preview: false,
      summary: {
        total: results.length,
        sent: results.filter(r => r.status === "sent").length,
        failed: results.filter(r => r.status === "failed").length,
      },
      results,
    });

  } catch (err) {
    console.error("🔥 Crash:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;