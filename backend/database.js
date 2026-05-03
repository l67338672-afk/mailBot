const Database = require("better-sqlite3");

const db = new Database("mailbot_v2.db");

// CUSTOMERS
db.prepare(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    company TEXT,
    business_name TEXT,
    business_email TEXT,
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

// SENT EMAILS (dedup guard — survives redeploys)
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

// Safe column migrations — ignored if column already exists
for (const sql of [
  "ALTER TABLE send_logs ADD COLUMN template_id INTEGER",
  "ALTER TABLE send_logs ADD COLUMN status TEXT",
  "ALTER TABLE send_logs ADD COLUMN sent_at TEXT",
  "ALTER TABLE customers ADD COLUMN business_name TEXT",
  "ALTER TABLE customers ADD COLUMN business_email TEXT",
]) {
  try { db.prepare(sql).run(); } catch (_) {}
}

// Seed campaigns if empty
if (db.prepare("SELECT COUNT(*) as c FROM campaigns").get().c === 0) {
  const ins = db.prepare(
    "INSERT INTO campaigns (name, day_offset, subject, body) VALUES (?, ?, ?, ?)"
  );
  ins.run(
    "Welcome",
    0,
    "{{business_name}} — Welcome! 👋",
    `Hi {{name}},

Thank you for visiting {{business_name}}! We're so glad to have you.

We look forward to seeing you again soon. Feel free to book your next appointment anytime.

– {{business_name}} Team`
  );
  ins.run(
    "Reminder",
    3,
    "{{business_name}} — We miss you! 🙂",
    `Hi {{name}},

It's been a few days since your last visit at {{business_name}}, and we just wanted to check in.

Whenever you're ready, we'd love to have you back. Give us a call or just drop in!

– {{business_name}} Team`
  );
  ins.run(
    "Offer",
    7,
    "{{business_name}} — A special offer just for you 🎁",
    `Hi {{name}},

We haven't seen you in a while at {{business_name}} and we miss you!

Here's something special to welcome you back:

🎁 20% OFF your next visit — valid for 3 days only.

Book your appointment today and we'll take care of the rest.

– {{business_name}} Team`
  );
}

// Seed templates if empty
if (db.prepare("SELECT COUNT(*) as c FROM templates").get().c === 0) {
  const ins = db.prepare(
    "INSERT INTO templates (name, subject, body, created_at) VALUES (?, ?, ?, ?)"
  );
  const now = new Date().toISOString();
  ins.run(
    "Welcome",
    "{{business_name}} — Welcome! 👋",
    `Hi {{name}},

Thank you for visiting {{business_name}}! We're so glad to have you.

We look forward to seeing you again soon. Feel free to book your next appointment anytime.

– {{business_name}} Team`,
    now
  );
  ins.run(
    "Comeback",
    "{{business_name}} — We miss you! 🙂",
    `Hi {{name}},

It's been a while since your last visit at {{business_name}}.

We were going through our client list and thought of you. Whenever you're ready, we'd love to have you back!

– {{business_name}} Team`,
    now
  );
  ins.run(
    "Special Offer",
    "{{business_name}} — A special offer just for you 🎁",
    `Hi {{name}},

We haven't seen you at {{business_name}} in a while, and we miss you!

Here's something special to welcome you back:

🎁 20% OFF your next visit — valid for 3 days only.

Reply YES to book your slot and we'll take care of everything.

– {{business_name}} Team`,
    now
  );
  ins.run(
    "Urgency",
    "{{business_name}} — Don't miss this, {{name}} 👀",
    `Hi {{name}},

This is a quick note from {{business_name}}.

We're running a limited-time offer this week and wanted you to be the first to know:

👉 Flat 20% OFF — only valid for 72 hours.

Slots are filling up fast. Reply YES to claim yours.

– {{business_name}} Team`,
    now
  );
}

module.exports = db;