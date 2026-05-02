let customers = [];
let templates = [
  {
    id: 1,
    name: "Welcome",
    subject: "Welcome {{name}} 👋",
    body: "Thanks for visiting us!"
  },
  {
    id: 2,
    name: "Reminder",
    subject: "We miss you {{name}}",
    body: "Come back and visit us again!"
  },
  {
    id: 3,
    name: "Offer",
    subject: "Special offer 🎁",
    body: "Flat 20% off for you!"
  },
  {
    id: 4,
    name: "Comeback",
    subject: "It’s been a while {{name}}",
    body: "We’d love to see you again!"
  }
];

let sendLogs = [];

function getCustomers() {
  return customers;
}

function addCustomer(data) {
  const customer = {
    id: Date.now(),
    name: data.name,
    email: data.email,
    company: data.company || "",
    created_at: new Date(),
    last_stage_sent: 0
  };

  customers.push(customer);
  return customer;
}

function getTemplates() {
  return templates;
}

function getTemplateById(id) {
  return templates.find(t => t.id === id);
}

function logSend(data) {
  sendLogs.push({
    id: Date.now(),
    ...data,
    created_at: new Date()
  });
}

module.exports = {
  getCustomers,
  addCustomer,
  getTemplates,
  getTemplateById,
  logSend
};