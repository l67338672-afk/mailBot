const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const db = require("./db");

function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
}

function createTransporter() {
  if (!process.env.BREVO_USER || !process.env.BREVO_PASS) {
    console.log("❌ Missing SMTP credentials");
    return null;
  }

  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
}

// POST /api/broadcast
router.post("/", async (req, res) => {
  try {
    const { templateId, customerIds } = req.body;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: "templateId is required",
      });
    }

    const template = db.getTemplateById(Number(templateId));
    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    const allCustomers = db.getCustomers();

    const targets =
      Array.isArray(customerIds) && customerIds.length > 0
        ? allCustomers.filter((c) =>
            customerIds.map(Number).includes(c.id)
          )
        : allCustomers;

    if (targets.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No customers found",
      });
    }

    const transporter = createTransporter();

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
        if (transporter) {
          await transporter.sendMail({
            from: `"${process.env.FROM_NAME || "MailBot"}" <${
              process.env.FROM_EMAIL || process.env.BREVO_USER
            }>`,
            to: customer.email,
            subject,
            text: body,
          });

          console.log("✅ Sent:", customer.email);
        } else {
          console.log("⚠️ Preview mode (no SMTP)");
        }

        db.logSend({
          customer_id: customer.id,
          template_id: template.id,
          status: "sent",
        });

        results.push({
          email: customer.email,
          status: transporter ? "sent" : "preview",
        });
      } catch (err) {
        console.error("❌ Send failed:", err.message);

        db.logSend({
          customer_id: customer.id,
          template_id: template.id,
          status: "failed",
        });

        results.push({
          email: customer.email,
          status: "failed",
          error: err.message,
        });
      }
    }

    return res.json({
      success: true,
      summary: {
        total: results.length,
        sent: results.filter((r) => r.status === "sent").length,
        failed: results.filter((r) => r.status === "failed").length,
      },
      results,
      preview: !transporter,
    });
  } catch (err) {
    console.error("🔥 Broadcast route crash:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;