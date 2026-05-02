// In-memory database with all required functions

let nextCustomerId = 3;
let nextTemplateId = 5;

let customers = [
  { id: 1, name: "Tushar Jangra", email: "167338672@gmail.com", company: "laddu wala", subscribed: true },
  { id: 2, name: "lakshay", email: "jangrat367@gmail.com", company: "laddu wali", subscribed: true }
];

let templates = [
  {
    id: 1,
    name: "Salon Comeback Offer",
    subject: "Hey {{name}}, we saved you something 🎁",
    body: "Hey {{name}} 👋\n\nIt's been a while since your last visit at {{company}}.\n\nWe've got something special for you:\n👉 20% OFF on your next visit\n\n⏳ Valid for next 3 days only\n\nReply YES to book your slot.\n\n– {{company}}"
  },
  {
    id: 2,
    name: "Urgency Offer",
    subject: "{{name}}, don't miss this 👀",
    body: "Hi {{name}},\n\nYou visited {{company}} before — we'd love to see you again.\n\nHere's a limited-time offer just for you:\n👉 Flat 20% OFF\n\nOnly valid for 72 hours.\n\nBook now or reply YES.\n\n– {{company}}"
  },
  {
    id: 3,
    name: "Soft Comeback Offer",
    subject: "{{name}}, we haven't seen you in a while 🙂",
    body: "Hey {{name}},\n\nIt's been a while since your last visit at {{company}}.\n\nWe were just going through our client list and thought of you 🙂\n\nSo we've kept something small for you — 20% off your next visit.\n\nNo pressure, just thought you might want to drop by again.\n\n– Team {{company}}"
  },
  {
    id: 4,
    name: "Follow-up Comeback",
    subject: "{{name}}, quick one from {{company}}",
    body: "Hey {{name}},\n\nHaven't seen you at {{company}} in a while.\n\nWe're running a small comeback offer this week.\n\nYou can come in and get 20% off your next visit.\n\nLet me know if you want me to book a slot for you.\n\n– Team {{company}}"
  }
];

let sendLog = [];

module.exports = {
  // Customers
  getCustomers: () => customers,

  getCustomerById: (id) => customers.find(c => c.id === id),

  insertCustomer: ({ name, email, company }) => {
    if (customers.find(c => c.email === email)) {
      throw new Error("UNIQUE: email already exists");
    }
    const c = { id: nextCustomerId++, name, email, company: company || "", subscribed: true };
    customers.push(c);
    return c;
  },

  deleteCustomer: (id) => {
    customers = customers.filter(c => c.id !== id);
  },

  // Templates
  getTemplates: () => templates,

  getTemplateById: (id) => templates.find(t => t.id === id),

  insertTemplate: ({ name, subject, body }) => {
    const t = { id: nextTemplateId++, name, subject, body };
    templates.push(t);
    return t;
  },

  deleteTemplate: (id) => {
    templates = templates.filter(t => t.id !== id);
  },

  // Logs
  logSend: (entry) => sendLog.push(entry),
  getLogs: () => sendLog
};