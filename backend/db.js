const db = require("./database");

function getCustomers() {
  return db.prepare("SELECT * FROM customers").all();
}

function addCustomer(data) {
  const result = db.prepare(`
    INSERT INTO customers (name, email, company, created_at)
    VALUES (?, ?, ?, ?)
  `).run(
    data.name,
    data.email,
    data.company || "",
    new Date().toISOString()
  );

  return { id: result.lastInsertRowid };
}

const templates = [
  { id: 1, name: "Welcome", subject: "Welcome 👋", body: "Thanks for visiting!" },
  { id: 2, name: "Reminder", subject: "We miss you!", body: "Come back soon!" },
  { id: 3, name: "Offer", subject: "Special Offer 🎁", body: "20% off!" },
  { id: 4, name: "Comeback", subject: "It’s been a while", body: "Visit again!" }
];

function getTemplates() {
  return templates;
}

function getTemplateById(id) {
  return templates.find(t => t.id === id);
}

function logSend(data) {
  db.prepare(`
    INSERT INTO send_logs (customer_id, template_id, status, created_at)
    VALUES (?, ?, ?, ?)
  `).run(
    data.customer_id,
    data.template_id,
    data.status,
    new Date().toISOString()
  );
}

module.exports = {
  getCustomers,
  addCustomer,
  getTemplates,
  getTemplateById,
  logSend
};