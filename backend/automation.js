const cron = require("node-cron");
const db = require("./db");

function runAutomation() {
  console.log("⚡ Automation check...");
  const customers = db.getCustomers();
  const logs = db.getLogs();

  for (const customer of customers) {
    if (customer.subscribed === false) continue;
    console.log(`✔ Checked: ${customer.email}`);
  }
}

// Run daily at 10 AM
cron.schedule("0 10 * * *", runAutomation);

module.exports = {};