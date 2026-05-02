const cron = require("node-cron");
const db = require("./db");

function daysSince(date) {
  const diff = new Date() - new Date(date);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function alreadySent(customerId, type) {
  const data = require("../mailbot.json");
  return data.send_log.some(
    log => log.customer_id === customerId && log.status === type
  );
}

function runAutomation() {
  console.log("⚡ Automation started...");

  const customers = db.getCustomers();

  for (const customer of customers) {
    if (customer.subscribed === false) continue;

    const days = daysSince(customer.last_visit_date);

    if (days >= 7 && !alreadySent(customer.id, "7_days")) {
      db.logSend({
        customer_id: customer.id,
        template_id: 0,
        status: "7_days",
      });
      console.log(`📩 7-day trigger → ${customer.email}`);
    }

    if (days >= 30 && !alreadySent(customer.id, "30_days")) {
      db.logSend({
        customer_id: customer.id,
        template_id: 0,
        status: "30_days",
      });
      console.log(`📩 30-day trigger → ${customer.email}`);
    }

    if (days >= 60 && !alreadySent(customer.id, "60_days")) {
      db.logSend({
        customer_id: customer.id,
        template_id: 0,
        status: "60_days",
      });
      console.log(`📩 60-day trigger → ${customer.email}`);
    }
  }
}

// run daily at 10 AM
cron.schedule("0 10 * * *", runAutomation);

module.exports = {};