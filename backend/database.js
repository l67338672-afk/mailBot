const Database = require("better-sqlite3");
const db = new Database("mailbot_v2.db");

// CUSTOMERS
db.prepare(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    company TEXT,
    created_at TEXT,
    last_stage_sent INTEGER DEFAULT 0
  )
`).run();

// CAMPAIGNS
db.prepare(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    day_offset INTEGER,
    subject TEXT,
    body TEXT
  )
`).run();

// SENT EMAILS
db.prepare(`
  CREATE TABLE IF NOT EXISTS sent_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    campaign_id INTEGER
  )
`).run();

// TEMPLATES
db.prepare(`
  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    subject TEXT,
    body TEXT,
    created_at TEXT
  )
`).run();

// SEND LOGS
db.prepare(`
  CREATE TABLE IF NOT EXISTS send_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    template_id INTEGER,
    status TEXT,
    sent_at TEXT
  )
`).run();

// Safe column migrations
for (const sql of [
  "ALTER TABLE send_logs ADD COLUMN template_id INTEGER",
  "ALTER TABLE send_logs ADD COLUMN status TEXT",
  "ALTER TABLE send_logs ADD COLUMN sent_at TEXT",
]) {
  try { db.prepare(sql).run(); } catch (_) {}
}

// Seed campaigns
if (db.prepare("SELECT COUNT(*) as c FROM campaigns").get().c === 0) {
  const ins = db.prepare("INSERT INTO campaigns (name, day_offset, subject, body) VALUES (?,?,?,?)");
  ins.run("Welcome",  0, "Welcome!",         "Hi {{name}}, welcome!");
  ins.run("Reminder", 3, "We miss you 👀",   "Hey {{name}}, come back!");
  ins.run("Offer",    7, "Special Offer 🎁", "Hi {{name}}, here's an offer!");
}

// Seed templates — THIS IS WHAT WAS MISSING
// broadcast.js reads from this table. Without rows here, every broadcast returns 404.
if (db.prepare("SELECT COUNT(*) as c FROM templates").get().c === 0) {
  const ins = db.prepare("INSERT INTO templates (name, subject, body, created_at) VALUES (?,?,?,?)");
  const now = new Date().toISOString();
  ins.run("Welcome",  "Welcome 👋",        "Hi {{name}}, thanks for joining!", now);
  ins.run("Reminder", "We miss you 👀",    "Hey {{name}}, come back soon!",    now);
  ins.run("Offer",    "Special Offer 🎁",  "Hi {{name}}, here's 20% off!",     now);
  ins.run("Comeback", "It's been a while", "Hey {{name}}, we saved a slot!",   now);
}

module.exports = db;