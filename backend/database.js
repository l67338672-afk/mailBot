const Database = require("better-sqlite3");

const db = new Database("mailbot.db");

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

// ✅ SENT EMAILS (CRITICAL — NO DUPLICATES)
db.prepare(`
  CREATE TABLE IF NOT EXISTS sent_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    campaign_id INTEGER
  )
`).run();

// 👉 seed campaigns if empty
const count = db.prepare("SELECT COUNT(*) as c FROM campaigns").get().c;

if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO campaigns (name, day_offset, subject, body)
    VALUES (?, ?, ?, ?)
  `);

  insert.run("Welcome", 0, "Welcome!", "Hi {{name}}, welcome!");
  insert.run("Reminder", 3, "We miss you 👀", "Hey {{name}}, come back!");
  insert.run("Offer", 7, "Special Offer 🎁", "Hi {{name}}, here's an offer!");
}

module.exports = db;