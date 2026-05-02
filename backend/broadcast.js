const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const db = require("./db");

function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
}

function createTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("❌ Missing SMTP credentials");
    return null;
  }

  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// POST /api/broadcast
router.post("/", async (req, res) => {
  try {
    const { templateId, customerIds } = req.body;

    if (!templateId) {
      return res.status(400).json({ success: false, error: "templateId is required" });
    }

    const template = db.getTemplateById(Number(templateId));
    if (!template) {
      return res.status(404).json({ success: false, error: "Template not found" });
    }

    let targets = Array.isArray(customerIds) && customerIds.length > 0
      ? db.getCustomers().filter(c => customerIds.map(Number).includes(c.id))
      : db.getCustomers();

    if (targets.length === 0) {
      return res.status(400).json({ success: false, error: "No customers found" });
    }

    const transporter = createTransporter();

    if (transporter) {
      try {
        await transporter.verify();
        console.log("✅ SMTP VERIFIED");
      } catch (err) {
        console.error("❌ SMTP ERROR:", err.message);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    const results = [];

    for (const customer of targets) {
      const vars = {
        name: customer.name,
        email: customer.email,
        company: customer.company || "",
      };

      const subject = interpolate(template.subject, vars);
      const body = interpolate(template.body, vars);

      try {
        if (transporter) {
          await transporter.sendMail({
            from: `"${process.env.FROM_NAME || "MailBot"}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
            to: customer.email,
            subject,
            text: body,
          });
        }

        db.logSend({
          customer_id: customer.id,
          template_id: template.id,
          status: "sent",
        });

        results.push({ email: customer.email, status: "sent" });

      } catch (e) {
        console.error("SEND FAIL:", e.message);

        db.logSend({
          customer_id: customer.id,
          template_id: template.id,
          status: "failed",
        });

        results.push({
          email: customer.email,
          status: "failed",
          error: e.message,
        });
      }
    }

    return res.json({
      success: true,
      summary: {
        total: results.length,
        sent: results.filter(r => r.status === "sent").length,
        failed: results.filter(r => r.status === "failed").length,
      },
      results,
      preview: !transporter,
    });

  } catch (err) {
    console.error("🔥 BROADCAST CRASH:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;