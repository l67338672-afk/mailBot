const express = require("express");
const router  = express.Router();
const db      = require("./database");

function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
}

function toHtml(text) {
  return text
    .split(/\n\n+/)
    .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

router.post("/", async (req, res) => {
  try {
    const { templateId, customerIds } = req.body;
    const bizId = req.business.id;

    if (!templateId)
      return res.status(400).json({ success: false, error: "templateId required" });

    const apiKey    = process.env.BREVO_API_KEY;
    const fromEmail = process.env.FROM_EMAIL;
    const fromName  = process.env.FROM_NAME || "MailBot";

    if (!apiKey || !fromEmail)
      return res.status(500).json({ success: false, error: "BREVO_API_KEY or FROM_EMAIL not configured." });

    const template = await db.getOne(
      "SELECT * FROM templates WHERE id = ? AND business_id = ?",
      [Number(templateId), bizId]
    );
    if (!template)
      return res.status(404).json({ success: false, error: "Template not found" });

    const allCustomers = await db.query(
      "SELECT * FROM customers WHERE business_id = ?",
      [bizId]
    );

    const targets = Array.isArray(customerIds) && customerIds.length > 0
      ? allCustomers.filter(c => customerIds.map(Number).includes(c.id))
      : allCustomers;

    if (targets.length === 0)
      return res.status(400).json({ success: false, error: "No customers found" });

    const results = [];

    for (const customer of targets) {
      const vars = {
        name:          customer.name          || "",
        email:         customer.email         || "",
        company:       customer.company       || "",
        business_name: customer.business_name || customer.company || req.business.name || "",
      };

      const subject  = interpolate(template.subject, vars);
      const textBody = interpolate(template.body,    vars);
      const htmlBody = toHtml(textBody);

      const payload = {
        sender:      { name: fromName, email: fromEmail },
        to:          [{ email: customer.email }],
        replyTo:     { email: fromEmail },
        subject,
        textContent: textBody,
        htmlContent: htmlBody,
      };

      try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method:  "POST",
          headers: { "Content-Type": "application/json", "api-key": apiKey },
          body:    JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        console.log("BREVO RESPONSE:", JSON.stringify(data));

        if (!response.ok) {
          console.error("BREVO ERROR:", JSON.stringify(data));
          throw new Error(data.message || `HTTP ${response.status}`);
        }

        console.log(`[SEND] ✅ → ${customer.email}`);
        await db.execute(
          "INSERT INTO send_logs (business_id, customer_id, template_id, status, sent_at) VALUES (?,?,?,?,datetime('now'))",
          [bizId, customer.id, template.id, "sent"]
        );
        results.push({ email: customer.email, status: "sent" });

      } catch (err) {
        console.error("BREVO ERROR:", err.message);
        await db.execute(
          "INSERT INTO send_logs (business_id, customer_id, template_id, status, sent_at) VALUES (?,?,?,?,datetime('now'))",
          [bizId, customer.id, template.id, "failed"]
        );
        results.push({ email: customer.email, status: "failed", error: err.message });
      }
    }

    return res.json({
      success: true,
      summary: {
        total:  results.length,
        sent:   results.filter(r => r.status === "sent").length,
        failed: results.filter(r => r.status === "failed").length,
      },
      results,
    });

  } catch (err) {
    console.error("🔥 Broadcast crash:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;