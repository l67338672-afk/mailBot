const db = require("./database");
const axios = require("axios");

// ---------------- SEND EMAIL VIA BREVO API ----------------
async function sendEmail(to, subject, body) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.log("⚠️ No API KEY → preview mode");
    return;
  }

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          email: process.env.FROM_EMAIL,
          name: process.env.FROM_NAME,
        },
        to: [{ email: to }],
        subject: subject,
        textContent: body,
      },
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Email sent →", to);
  } catch (err) {
    console.error(
      "❌ Email failed:",
      err.response?.data || err.message
    );
  }
}

// ---------------- TEMPLATE VARIABLE REPLACER ----------------
function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
}

// ---------------- MAIN AUTOMATION ----------------
async function runAutomation() {
  console.log("⚡ Automation running...");

  const customers = db.prepare("SELECT * FROM customers").all();
  const campaigns = db
    .prepare("SELECT * FROM campaigns ORDER BY day_offset ASC")
    .all();

  const now = Date.now();

  for (const c of customers) {
    const created = new Date(c.created_at).getTime();
    const daysPassed = Math.floor(
      (now - created) / (1000 * 60 * 60 * 24)
    );

    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i];

      if (
        daysPassed >= campaign.day_offset &&
        c.last_stage_sent < i + 1
      ) {
        console.log(`📩 Sending Day ${campaign.day_offset} →`, c.email);

        const subject = interpolate(campaign.subject, {
          name: c.name,
          email: c.email,
        });

        const body = interpolate(campaign.body, {
          name: c.name,
          email: c.email,
        });

        // 👉 SEND EMAIL
        await sendEmail(c.email, subject, body);

        // 👉 UPDATE DATABASE
        db.prepare(
          "UPDATE customers SET last_stage_sent = ? WHERE id = ?"
        ).run(i + 1, c.id);
      }
    }
  }
}

module.exports = runAutomation;