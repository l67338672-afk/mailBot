const db = require("./database");
const nodemailer = require("nodemailer");

// ---------------- SMTP ----------------
function createTransporter() {
  if (!process.env.BREVO_USER || !process.env.BREVO_PASS) {
    console.log("⚠️ No SMTP → preview mode");
    return null;
  }

  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS,
    },
  });
}

// ---------------- VARIABLE REPLACE ----------------
function interpolate(text, vars) {
  if (!text) return "";
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
}

// ---------------- MAIN AUTOMATION ----------------
function runAutomation() {
  console.log("⚡ Automation running...");

  const transporter = createTransporter();

  const customers = db.prepare("SELECT * FROM customers").all();
  const campaigns = db
    .prepare("SELECT * FROM campaigns ORDER BY day_offset ASC")
    .all();

  const now = Date.now();

  customers.forEach((c) => {
    if (!c.created_at) return;

    const created = new Date(c.created_at).getTime();
    const daysPassed = Math.floor((now - created) / (1000 * 60 * 60 * 24));

    campaigns.forEach((campaign) => {
      // ✅ Only send on EXACT day (no spam)
      if (daysPassed !== campaign.day_offset) return;

      // ✅ Prevent duplicate emails
      const alreadySent = db.prepare(`
        SELECT id FROM sent_emails
        WHERE customer_id = ? AND campaign_id = ?
      `).get(c.id, campaign.id);

      if (alreadySent) return;

      console.log(`📩 Sending Day ${campaign.day_offset} → ${c.email}`);

      const subject = interpolate(campaign.subject, {
        name: c.name,
        email: c.email,
        company: c.company,
      });

      const body = interpolate(campaign.body, {
        name: c.name,
        email: c.email,
        company: c.company,
      });

      // ✅ Send email
      if (transporter) {
        transporter.sendMail({
          from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
          to: c.email,
          subject,
          text: body,
        });
      } else {
        console.log("📨 PREVIEW:", subject);
      }

      // ✅ Mark as sent (CRITICAL)
      db.prepare(`
        INSERT INTO sent_emails (customer_id, campaign_id)
        VALUES (?, ?)
      `).run(c.id, campaign.id);
    });
  });
}

module.exports = runAutomation;