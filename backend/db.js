const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");

const adapter = new FileSync(path.join(__dirname, "..", "mailbot.json"));
const db = low(adapter);

const BUSINESS_ID = 1; // 🔥 CHANGE PER CLIENT

db.defaults({
  customers: [],
  templates: [],
  send_log: [],
  _seq: { customers: 0, templates: 0, send_log: 0 },
}).write();

function nextId(table) {
  const id = db.get(`_seq.${table}`).value() + 1;
  db.set(`_seq.${table}`, id).write();
  return id;
}

function now() {
  return new Date().toISOString();
}

// Customers
db.getCustomers = () =>
  db.get("customers").filter({ business_id: BUSINESS_ID }).value();

db.getCustomerById = (id) =>
  db.get("customers").find({ id, business_id: BUSINESS_ID }).value();

db.insertCustomer = ({ name, email, company, last_visit_date }) => {
  if (db.get("customers").find({ email, business_id: BUSINESS_ID }).value())
    throw new Error("UNIQUE: email already exists");

  const c = {
    id: nextId("customers"),
    business_id: BUSINESS_ID,
    name,
    email,
    company: company || "",
    last_visit_date: last_visit_date || now(),
    subscribed: true,
    created_at: now(),
  };

  db.get("customers").push(c).write();
  return c;
};

db.updateCustomer = (id, data) =>
  db.get("customers")
    .find({ id, business_id: BUSINESS_ID })
    .assign(data)
    .write();

db.deleteCustomer = (id) =>
  db.get("customers")
    .remove({ id, business_id: BUSINESS_ID })
    .write();

// Templates (shared for now)
db.getTemplates = () => db.get("templates").value();

db.insertTemplate = ({ name, subject, body }) => {
  const t = {
    id: nextId("templates"),
    name,
    subject,
    body,
    created_at: now(),
  };
  db.get("templates").push(t).write();
  return t;
};

// Logs (per business implicitly via customer_id)
db.logSend = ({ customer_id, template_id, status }) =>
  db.get("send_log").push({
    id: nextId("send_log"),
    customer_id,
    template_id,
    status,
    opened: false,
    sent_at: now(),
  }).write();

module.exports = db;