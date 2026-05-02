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

// SENT EMAILS (dedup guard for automation)
db.prepare(`
  CREATE TABLE IF NOT EXISTS sent_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    campaign_id INTEGER
  )
`).run();

// TEMPLATES (for broadcast)
db.prepare(`
  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    subject TEXT,
    body TEXT,
    created_at TEXT
  )
`).run();

// SEND LOGS (for broadcast history)
db.prepare(`
  CREATE TABLE IF NOT EXISTS send_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    template_id INTEGER,
    status TEXT,
    sent_at TEXT
  )
`).run();

// Safe migrations — ignored if columns already exist
for (const migration of [
  "ALTER TABLE send_logs ADD COLUMN template_id INTEGER",
  "ALTER TABLE send_logs ADD COLUMN status TEXT",
]) {
  try { db.prepare(migration).run(); } catch (_) {}
}

// ── Seed campaigns if empty ──────────────────────────────────────────────────
const campaignCount = db.prepare("SELECT COUNT(*) as c FROM campaigns").get().c;
if (campaignCount === 0) {
  const insertCampaign = db.prepare(
    "INSERT INTO campaigns (name, day_offset, subject, body) VALUES (?, ?, ?, ?)"
  );
  insertCampaign.run("Welcome",  0, "Welcome!",          "Hi {{name}}, welcome!");
  insertCampaign.run("Reminder", 3, "We miss you 👀",    "Hey {{name}}, come back!");
  insertCampaign.run("Offer",    7, "Special Offer 🎁",  "Hi {{name}}, here's an offer!");
}

// ── Seed templates if empty ──────────────────────────────────────────────────
// CRITICAL: broadcast.js reads from THIS table. It must not be empty.
const templateCount = db.prepare("SELECT COUNT(*) as c FROM templates").get().c;
if (templateCount === 0) {
  const insertTemplate = db.prepare(
    "INSERT INTO templates (name, subject, body, created_at) VALUES (?, ?, ?, ?)"
  );
  const now = new Date().toISOString();
  insertTemplate.run("Welcome",  "Welcome 👋",         "Hi {{name}}, thanks for joining!",    now);
  insertTemplate.run("Reminder", "We miss you 👀",     "Hey {{name}}, come back soon!",       now);
  insertTemplate.run("Offer",    "Special Offer 🎁",   "Hi {{name}}, here's 20% off!",        now);
  insertTemplate.run("Comeback", "It's been a while",  "Hey {{name}}, we saved a slot!",      now);
}

module.exports = db;