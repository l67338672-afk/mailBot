const db = require("./db");
const nodemailer = require("nodemailer");

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function createTransporter() {
  if (!process.env.BREVO_USER || !process.env.BREVO_PASS) {
    console.log("⚠️ No SMTP → running in preview mode");
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

function daysSince(date) {
  return (Date.now() - new Date(date)) / (1000 * 60 * 60 * 24);
}

async function sendMail(transporter, customer, subject, text) {
  if (!transporter) {
    console.log("📩 PREVIEW:", subject, "→", customer.email);
    return;
  }

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: customer.email,
    subject,
    text
  });

  console.log("✅ Sent:", subject, "→", customer.email);
}

async function runAutomation() {
  console.log("⚡ Automation started...");

  const transporter = createTransporter();

  while (true) {
    const customers = db.getCustomers();

    for (const c of customers) {
      const days = daysSince(c.created_at);

      try {
        if (c.last_stage_sent === 0) {
          await sendMail(transporter, c, "Welcome 👋", "Thanks for visiting us!");
          c.last_stage_sent = 1;
        }

        else if (c.last_stage_sent === 1 && days >= 3) {
          await sendMail(transporter, c, "We miss you!", "Come back soon!");
          c.last_stage_sent = 2;
        }

        else if (c.last_stage_sent === 2 && days >= 7) {
          await sendMail(transporter, c, "Special Offer 🎁", "Flat 20% off!");
          c.last_stage_sent = 3;
        }

        else if (c.last_stage_sent === 3 && days >= 30) {
          await sendMail(transporter, c, "Comeback!", "We’d love to see you again!");
          c.last_stage_sent = 4;
        }

      } catch (err) {
        console.log("❌ Automation error:", err.message);
      }

      await sleep(1500);
    }

    await sleep(60000); // loop every 1 min
  }
}

module.exports = runAutomation;