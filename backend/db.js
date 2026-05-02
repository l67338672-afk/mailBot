const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "mailbot.json");

function readData() {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// CUSTOMERS
function getCustomers() {
  return readData().customers;
}

function addCustomer(customer) {
  const data = readData();
  customer.id = ++data._seq.customers;
  data.customers.push(customer);
  writeData(data);
  return customer;
}

function deleteCustomer(id) {
  const data = readData();
  data.customers = data.customers.filter(c => c.id !== id);
  writeData(data);
}

// TEMPLATES
function getTemplates() {
  return readData().templates;
}

// ✅ THIS WAS MISSING
function getTemplateById(id) {
  const data = readData();
  return data.templates.find(t => t.id === id);
}

function addTemplate(template) {
  const data = readData();
  template.id = ++data._seq.templates;
  data.templates.push(template);
  writeData(data);
  return template;
}

function deleteTemplate(id) {
  const data = readData();
  data.templates = data.templates.filter(t => t.id !== id);
  writeData(data);
}

// SEND LOG
function logSend(entry) {
  const data = readData();
  entry.id = ++data._seq.send_log;
  entry.sent_at = new Date().toISOString();
  data.send_log.push(entry);
  writeData(data);
}

module.exports = {
  getCustomers,
  addCustomer,
  deleteCustomer,
  getTemplates,
  getTemplateById, // ✅ IMPORTANT
  addTemplate,
  deleteTemplate,
  logSend
};