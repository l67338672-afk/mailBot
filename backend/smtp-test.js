require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

(async () => {
  try {
    await transporter.verify();
    console.log("✅ SMTP WORKS");
  } catch (err) {
    console.error("❌ SMTP FAIL:", err.message);
  }
})();