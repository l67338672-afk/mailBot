const db = require("./database");
const nodemailer = require("nodemailer");

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

function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
}

function runAutomation() {
  console.log("⚡ Automation running...");

  const transporter = createTransporter();

  const customers = db.prepare("SELECT * FROM customers").all();
  const campaigns = db
    .prepare("SELECT * FROM campaigns ORDER BY day_offset ASC")
    .all();

  const now = Date.now();

  customers.forEach((c) => {
    const created = new Date(c.created_at).getTime();
    const daysPassed = Math.floor((now - created) / (1000 * 60 * 60 * 24));

    campaigns.forEach((campaign, index) => {
      if (
        daysPassed >= campaign.day_offset &&
        c.last_stage_sent < index + 1
      ) {
        console.log(`📩 Sending stage ${index + 1} →`, c.email);

        const subject = interpolate(campaign.subject, {
          name: c.name,
          email: c.email,
        });

        const body = interpolate(campaign.body, {
          name: c.name,
          email: c.email,
        });

        if (transporter) {
          transporter.sendMail({
            from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
            to: c.email,
            subject,
            text: body,
          });
        }

        db.prepare(
          "UPDATE customers SET last_stage_sent = ? WHERE id = ?"
        ).run(index + 1, c.id);
      }
    });
  });
}

module.exports = runAutomation;