const express = require("express");
const router  = express.Router();
const db      = require("./database");

function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
}

const logStmt = () => db.prepare(
  "INSERT INTO send_logs (customer_id, template_id, status, sent_at) VALUES (?,?,?,?)"
);

router.post("/", async (req, res) => {
  try {
    const { templateId, customerIds } = req.body;

    if (!templateId) {
      return res.status(400).json({ success: false, error: "templateId required" });
    }

    console.log("📨 templateId received:", templateId);

    const template = db.prepare("SELECT * FROM templates WHERE id = ?").get(Number(templateId));

    console.log("📋 Template resolved:", template ? `[${template.id}] ${template.name}` : "NOT FOUND");

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

    // Preview mode — no API key configured
    if (!API_KEY) {
      console.log("⚠️ No BREVO_API_KEY — preview mode. Template:", template.name);
      return res.json({
        success: true,
        preview: true,
        summary: { total: targets.length, sent: 0, failed: 0 },
        results: targets.map(c => ({ email: c.email, status: "preview" })),
      });
    }

    const results = [];
    const insert  = logStmt();

    for (const customer of targets) {
      // Build interpolation vars — includes business_name per customer
      const vars = {
        name:          customer.name          || "",
        email:         customer.email         || "",
        company:       customer.company       || "",
        business_name: customer.business_name || customer.company || process.env.FROM_NAME || "Us",
      };

      // Dynamic sender: each customer's own business identity
      const fromName  = customer.business_name  || customer.company || process.env.FROM_NAME  || "MailBot";
      const fromEmail = customer.business_email || process.env.FROM_EMAIL;

      const subject = interpolate(template.subject, vars);
      const body    = interpolate(template.body,    vars);

      console.log(`📤 [${template.name}] → ${customer.email} | from: ${fromName} | subject: ${subject}`);

      try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": API_KEY,
          },
          body: JSON.stringify({
            sender: { name: fromName, email: fromEmail },
            to:     [{ email: customer.email }],
            subject,
            textContent: body,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `Brevo error ${response.status}`);

        console.log("✅ Sent:", customer.email);
        insert.run(customer.id, template.id, "sent",   new Date().toISOString());
        results.push({ email: customer.email, status: "sent" });

      } catch (err) {
        console.error("❌ Failed:", customer.email, err.message);
        insert.run(customer.id, template.id, "failed", new Date().toISOString());
        results.push({ email: customer.email, status: "failed", error: err.message });
      }
    }

    return res.json({
      success: true,
      preview: false,
      summary: {
        total:  results.length,
        sent:   results.filter(r => r.status === "sent").length,
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