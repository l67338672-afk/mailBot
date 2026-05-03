const db = require("./database");
const axios = require("axios");

function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
}

async function sendEmail({ to, subject, body, fromName, fromEmail }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.log("⚠️ No BREVO_API_KEY → preview mode, skipping send");
    return { success: false, preview: true };
  }

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name:  fromName  || process.env.FROM_NAME  || "MailBot",
          email: fromEmail || process.env.FROM_EMAIL,
        },
        to: [{ email: to }],
        subject,
        textContent: body,
      },
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Sent →", to);
    return { success: true };
  } catch (err) {
    console.error("❌ Failed →", to, "|", err.response?.data || err.message);
    return { success: false };
  }
}

async function runAutomation() {
  console.log("⚡ Automation running...");

  let customers, campaigns;

  try {
    customers = db.prepare("SELECT * FROM customers").all();
    campaigns = db.prepare("SELECT * FROM campaigns ORDER BY day_offset ASC").all();
  } catch (err) {
    console.error("❌ DB read failed:", err.message);
    return;
  }

  if (!customers.length) { console.log("ℹ️ No customers found."); return; }
  if (!campaigns.length) { console.log("ℹ️ No campaigns found."); return; }

  const now = Date.now();

  const alreadySentStmt = db.prepare(
    "SELECT 1 FROM sent_emails WHERE customer_id = ? AND campaign_id = ? LIMIT 1"
  );
  const insertSentStmt = db.prepare(
    "INSERT INTO sent_emails (customer_id, campaign_id) VALUES (?, ?)"
  );
  const updateStageStmt = db.prepare(
    "UPDATE customers SET last_stage_sent = ? WHERE id = ?"
  );

  for (const customer of customers) {
    let daysPassed;

    try {
      const created = new Date(customer.created_at).getTime();
      if (isNaN(created)) throw new Error("Invalid created_at date");
      daysPassed = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    } catch (err) {
      console.error(`❌ Bad created_at for customer ${customer.id}:`, err.message);
      continue;
    }

    const vars = {
      name:          customer.name          || "",
      email:         customer.email         || "",
      company:       customer.company       || "",
      business_name: customer.business_name || customer.company || process.env.FROM_NAME || "Us",
    };

    const fromName  = customer.business_name  || customer.company || process.env.FROM_NAME  || "MailBot";
    const fromEmail = customer.business_email || process.env.FROM_EMAIL;

    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i];

      if (daysPassed < campaign.day_offset) continue;

      try {
        const alreadySent = alreadySentStmt.get(customer.id, campaign.id);
        if (alreadySent) {
          console.log(`⏭️ Already sent Day ${campaign.day_offset} → ${customer.email}`);
          continue;
        }
      } catch (err) {
        console.error(
          `❌ Dedup check failed — customer ${customer.id} / campaign ${campaign.id}:`,
          err.message
        );
        continue;
      }

      const subject = interpolate(campaign.subject, vars);
      const body    = interpolate(campaign.body,    vars);

      console.log(`📩 Sending Day ${campaign.day_offset} → ${customer.email} (from: ${fromName})`);

      const result = await sendEmail({ to: customer.email, subject, body, fromName, fromEmail });

      if (result.success) {
        try {
          insertSentStmt.run(customer.id, campaign.id);
          updateStageStmt.run(i + 1, customer.id);
        } catch (err) {
          console.error(
            `❌ DB write failed after send — customer ${customer.id} / campaign ${campaign.id}:`,
            err.message
          );
        }
      }
    }
  }

  console.log("✅ Automation cycle complete.");
}

module.exports = runAutomation;