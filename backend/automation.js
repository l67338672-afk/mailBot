const db = require("./database");

let isRunning = false;

function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
}

function toHtml(text) {
  return text
    .split(/\n\n+/)
    .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

async function sendEmail({ to, subject, textBody }) {
  const apiKey    = process.env.BREVO_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;
  const fromName  = process.env.FROM_NAME || "MailBot";

  if (!apiKey) {
    console.error("❌ [automation] BREVO_API_KEY not set — cannot send");
    return { success: false };
  }
  if (!fromEmail) {
    console.error("❌ [automation] FROM_EMAIL not set — cannot send");
    return { success: false };
  }

  const payload = {
    sender:      { name: fromName, email: fromEmail },
    to:          [{ email: to }],
    replyTo:     { email: fromEmail },
    subject,
    textContent: textBody,
    htmlContent: toHtml(textBody),
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method:  "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    console.log("BREVO RESPONSE:", JSON.stringify(data));

    if (!response.ok) {
      console.error("BREVO ERROR:", JSON.stringify(data));
      return { success: false, error: data.message || `HTTP ${response.status}` };
    }

    console.log(`[SEND] ✅ → ${to} | subject: ${subject}`);
    return { success: true };
  } catch (err) {
    console.error("BREVO ERROR:", err.message);
    return { success: false, error: err.message };
  }
}

async function runForBusiness(business) {
  const bizId = business.id;

  let customers, campaigns;
  try {
    customers = await db.query(
      "SELECT * FROM customers WHERE business_id = ?",
      [bizId]
    );
    campaigns = await db.query(
      "SELECT * FROM campaigns WHERE business_id = ? ORDER BY day_offset ASC",
      [bizId]
    );
  } catch (err) {
    console.error(`❌ [automation] DB read failed biz ${bizId}:`, err.message);
    return;
  }

  if (!customers.length) return;
  if (!campaigns.length) return;

  const now = Date.now();

  for (const customer of customers) {
    let daysPassed;
    try {
      const created = new Date(customer.created_at).getTime();
      if (isNaN(created)) throw new Error("Invalid created_at");
      daysPassed = Math.floor((now - created) / 86400000);
      console.log(`[CHECK] ${customer.email} → day ${daysPassed}`);
    } catch (err) {
      console.error(`❌ [automation] Bad created_at customer ${customer.id}:`, err.message);
      continue;
    }

    const vars = {
      name:          customer.name          || "",
      email:         customer.email         || "",
      company:       customer.company       || "",
      business_name: customer.business_name || customer.company || business.name || "",
    };

    for (const campaign of campaigns) {
      // Only send on the exact matching day
      if (campaign.day_offset !== daysPassed) continue;

      // Dedup: check send_logs with business_id + customer_id + campaign_id + status=sent
      let alreadySent;
      try {
        alreadySent = await db.getOne(
          `SELECT id FROM send_logs
           WHERE business_id = ? AND customer_id = ? AND campaign_id = ? AND status = 'sent'
           LIMIT 1`,
          [bizId, customer.id, campaign.id]
        );
      } catch (err) {
        console.error(`❌ [automation] Dedup check error:`, err.message);
        continue;
      }

      if (alreadySent) {
        console.log(`[SKIP] Already sent Day ${campaign.day_offset} → ${customer.email}`);
        continue;
      }

      const subject  = interpolate(campaign.subject, vars);
      const textBody = interpolate(campaign.body,    vars);

      console.log(`[SEND] biz=${bizId} | Day ${campaign.day_offset} → ${customer.email}`);

      const result = await sendEmail({ to: customer.email, subject, textBody });

      if (result.success) {
        try {
          await db.execute(
            `INSERT INTO send_logs (business_id, customer_id, campaign_id, status, sent_at)
             VALUES (?, ?, ?, 'sent', datetime('now'))`,
            [bizId, customer.id, campaign.id]
          );
          await db.execute(
            `UPDATE customers SET last_stage_sent = ? WHERE id = ? AND business_id = ?`,
            [campaign.day_offset, customer.id, bizId]
          );
        } catch (err) {
          console.error(`⚠️  [automation] DB log failed after send:`, err.message);
        }
      } else {
        // Log failure so we can track it — do NOT skip on next cycle
        try {
          await db.execute(
            `INSERT INTO send_logs (business_id, customer_id, campaign_id, status, sent_at)
             VALUES (?, ?, ?, 'failed', datetime('now'))`,
            [bizId, customer.id, campaign.id]
          );
        } catch (_) {}
      }
    }
  }
}

async function runAutomation() {
  if (isRunning) {
    console.log("⏸️  [automation] Previous cycle running — skipping tick");
    return;
  }

  isRunning = true;
  console.log("⚡ [automation] Cycle started:", new Date().toISOString());

  try {
    const businesses = await db.query("SELECT * FROM businesses");
    if (!businesses.length) {
      console.log("ℹ️  [automation] No businesses.");
      return;
    }
    for (const biz of businesses) {
      await runForBusiness(biz);
    }
    console.log("✅ [automation] Cycle complete:", new Date().toISOString());
  } catch (err) {
    console.error("❌ [automation] Cycle error:", err.message);
  } finally {
    isRunning = false;
  }
}

module.exports = runAutomation;