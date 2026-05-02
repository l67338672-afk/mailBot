const db = require("./database");
const nodemailer = require("nodemailer");

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

function sendEmail(transporter, to, subject, text) {
  if (!transporter) return;

  return transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    text,
  });
}

function runAutomation() {
  console.log("⚡ Automation running...");

  const transporter = createTransporter();
  const customers = db.prepare("SELECT * FROM customers").all();

  const now = Date.now();

  customers.forEach((c) => {
    const created = new Date(c.created_at).getTime();
    const daysPassed = Math.floor((now - created) / (1000 * 60 * 60 * 24));

    // STAGE 0 → DAY 0 (Welcome)
    if (c.last_stage_sent === 0 && daysPassed >= 0) {
      console.log("📩 Welcome →", c.email);

      sendEmail(
        transporter,
        c.email,
        "Welcome!",
        `Hi ${c.name}, thanks for visiting us!`
      );

      db.prepare("UPDATE customers SET last_stage_sent = 1 WHERE id = ?").run(c.id);
    }

    // STAGE 1 → DAY 3
    else if (c.last_stage_sent === 1 && daysPassed >= 3) {
      console.log("📩 Reminder →", c.email);

      sendEmail(
        transporter,
        c.email,
        "We miss you 👀",
        `Hey ${c.name}, it's been a few days!`
      );

      db.prepare("UPDATE customers SET last_stage_sent = 2 WHERE id = ?").run(c.id);
    }

    // STAGE 2 → DAY 7
    else if (c.last_stage_sent === 2 && daysPassed >= 7) {
      console.log("📩 Offer →", c.email);

      sendEmail(
        transporter,
        c.email,
        "Special Offer 🎁",
        `Hi ${c.name}, here's a special offer for you!`
      );

      db.prepare("UPDATE customers SET last_stage_sent = 3 WHERE id = ?").run(c.id);
    }

    // STAGE 3 → DAY 30
    else if (c.last_stage_sent === 3 && daysPassed >= 30) {
      console.log("📩 Comeback →", c.email);

      sendEmail(
        transporter,
        c.email,
        "Come back!",
        `We haven't seen you in a while ${c.name}!`
      );

      db.prepare("UPDATE customers SET last_stage_sent = 4 WHERE id = ?").run(c.id);
    }
  });
}

module.exports = runAutomation;