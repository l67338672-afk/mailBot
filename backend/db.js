let customers = [
  { id: 1, name: "Tushar Jangra", email: "167338672@gmail.com", company: "laddu wala" },
  { id: 2, name: "lakshay", email: "jangrat367@gmail.com", company: "laddu wali" }
];

let templates = [
  {
    id: 1,
    name: "Salon Comeback Offer",
    subject: "Hey {{name}}, we saved you something 🎁",
    body: "Hi {{name}}, come back to {{company}} and get a special offer!"
  },
  {
    id: 2,
    name: "Urgency Offer",
    subject: "{{name}}, don’t miss this 👀",
    body: "Limited time for {{name}} at {{company}}!"
  },
  {
    id: 3,
    name: "Soft Comeback Offer",
    subject: "{{name}}, we haven’t seen you in a while 🙂",
    body: "We miss you {{name}}! Visit {{company}} soon."
  },
  {
    id: 4,
    name: "Follow-up Comeback",
    subject: "{{name}}, quick one from {{company}}",
    body: "Just checking in {{name}} from {{company}}."
  }
];

let sendLog = [];

module.exports = {
  getCustomers: () => customers,
  addCustomer: (c) => {
    c.id = Date.now();
    customers.push(c);
  },
  deleteCustomer: (id) => {
    customers = customers.filter(c => c.id !== id);
  },

  getTemplates: () => templates,
  getTemplateById: (id) => templates.find(t => t.id === id),

  logSend: (entry) => sendLog.push(entry),
  getLogs: () => sendLog
};