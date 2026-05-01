const cron = require("node-cron");
const db = require("./db");
const nodemailer = require("nodemailer");

function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS,
    },
  });
}

const campaigns = [
  { name: "7_days", days: 7 },
  { name: "30_days", days: 30 },
  { name: "60_days", days: 60 },
];

async function runAutomation() {
  console.log("⚡ Automation started...");

  const customers = db.getCustomers();
  const transporter = createTransporter();
  const now = new Date();

  for (const customer of customers) {

    if (customer.subscribed === false) continue;
    if (!customer.last_visit_date) continue;

    const lastVisit = new Date(customer.last_visit_date);
    const diffDays = (now - lastVisit) / (1000 * 60 * 60 * 24);

    for (const campaign of campaigns) {
      const alreadySent = db
        .get("send_log")
        .find({
          customer_id: customer.id,
          status: campaign.name,
        })
        .value();

      if (diffDays >= campaign.days && !alreadySent) {
        try {
          await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to: customer.email,
            subject: `${campaign.name} reminder`,
            html: `
              <p>Hello ${customer.name}</p>
              <p>This is your ${campaign.name} follow-up</p>

              <a href="http://localhost:3001/api/unsubscribe/${customer.id}">
                Unsubscribe
              </a>

              <img src="http://localhost:3001/api/track/open/${customer.id}" width="1" height="1" />
            `,
          });

          console.log(`✅ ${campaign.name} sent to`, customer.email);

          db.logSend({
            customer_id: customer.id,
            template_id: 0,
            status: campaign.name,
          });

        } catch (err) {
          console.log("❌ Failed:", err.message);
        }

        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
}

cron.schedule("0 10 * * *", runAutomation);
runAutomation();