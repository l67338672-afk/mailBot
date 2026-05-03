const db   = require("./database");


function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
}

function toHtml(text) {
  return text
    .split(/\n\n+/)
    .map(para => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

async function sendEmail({ to, subject, textBody, fromName, fromEmail }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.log("⚠️  No BREVO_API_KEY — preview mode, skipping send");
    return { success: false, preview: true };
  }

  const msgId = `<${Date.now()}-${to.replace(/[^a-zA-Z0-9]/g, "")}>`;

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { 
        "api-key": apiKey, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        sender:      { name: fromName || "MailBot", email: fromEmail || process.env.FROM_EMAIL },
        to:          [{ email: to }],
        replyTo:     { email: fromEmail || process.env.FROM_EMAIL },
        subject,
        textContent: textBody,
        htmlContent: toHtml(textBody),
        headers:     { "Message-ID": msgId, "X-Mailer": "MailBot/1.0" },
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    console.log("✅ Sent →", to);
    return { success: true };
  } catch (err) {
    console.error("❌ Failed →", to, "|", err.message);
    return { success: false };
  }
}

async function runAutomation() {
  console.log("⚡ Automation running...");

  let businesses;
  try {
    businesses = await db.query("SELECT * FROM businesses");
  } catch (err) {
    console.error("❌ Could not load businesses:", err.message);
    return;
  }

  if (!businesses.length) { console.log("ℹ️  No businesses found."); return; }

  for (const business of businesses) {
    await runForBusiness(business);
  }

  console.log("✅ Automation cycle complete.");
}

async function runForBusiness(business) {
  const bizId = business.id;

  let customers, campaigns;
  try {
    customers = await db.query("SELECT * FROM customers WHERE business_id = ?", [bizId]);
    campaigns = await db.query("SELECT * FROM campaigns WHERE business_id = ? ORDER BY day_offset ASC", [bizId]);
  } catch (err) {
    console.error(`❌ DB read failed for business ${bizId}:`, err.message);
    return;
  }

  if (!customers.length || !campaigns.length) return;

  const now = Date.now();

  for (const customer of customers) {
    let daysPassed;
    try {
      const created = new Date(customer.created_at).getTime();
      if (isNaN(created)) throw new Error("Invalid created_at date");
      daysPassed = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    } catch (err) {
      console.error(`❌ Bad created_at — customer ${customer.id}:`, err.message);
      continue;
    }

    const vars = {
      name:          customer.name          || "",
      email:         customer.email         || "",
      company:       customer.company       || "",
      business_name: customer.business_name || customer.company || business.name || "",
    };

    const fromName  = customer.business_name  || customer.company || business.name  || "MailBot";
    const fromEmail = customer.business_email || business.email   || process.env.FROM_EMAIL;

    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i];

      if (daysPassed < campaign.day_offset) continue;

      try {
        const alreadySent = await db.getOne(
          "SELECT 1 FROM sent_emails WHERE business_id = ? AND customer_id = ? AND campaign_id = ? LIMIT 1",
          [bizId, customer.id, campaign.id]
        );
        if (alreadySent) {
          console.log(`⏭️  Already sent Day ${campaign.day_offset} → ${customer.email}`);
          continue;
        }
      } catch (err) {
        console.error(`❌ Dedup check failed — biz ${bizId} / customer ${customer.id} / campaign ${campaign.id}:`, err.message);
        continue;
      }

      const subject  = interpolate(campaign.subject, vars);
      const textBody = interpolate(campaign.body,    vars);

      console.log(`📩 [biz ${bizId}] Day ${campaign.day_offset} → ${customer.email} (from: ${fromName})`);

      const result = await sendEmail({ to: customer.email, subject, textBody, fromName, fromEmail });

      if (result.success) {
        try {
          await db.execute(
            "INSERT INTO sent_emails (business_id, customer_id, campaign_id) VALUES (?, ?, ?)",
            [bizId, customer.id, campaign.id]
          );
          await db.execute(
            "UPDATE customers SET last_stage_sent = ? WHERE id = ? AND business_id = ?",
            [i + 1, customer.id, bizId]
          );
        } catch (err) {
          console.error(`❌ DB write failed — biz ${bizId} / customer ${customer.id} / campaign ${campaign.id}:`, err.message);
        }
      }
    }
  }
}

module.exports = runAutomation;