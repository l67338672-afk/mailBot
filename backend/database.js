const fs       = require("fs");
const path     = require("path");
const Database = require("better-sqlite3");

// Ensure persistent disk directory exists before opening DB.
// On Render this maps to the mounted persistent disk at /data.
// Locally it creates ./data so the app still runs in dev.
const DB_DIR  = process.env.DB_DIR || "/data";
const DB_PATH = path.join(DB_DIR, "mailbot.db");

try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log(`📁 Created DB directory: ${DB_DIR}`);
  }
} catch (err) {
  console.error(`❌ Could not create DB directory (${DB_DIR}):`, err.message);
  console.error("   Falling back to local mailbot.db");
}

const db = new Database(
  fs.existsSync(DB_DIR) ? DB_PATH : "mailbot.db"
);

console.log("🗄️  Database path:", db.name);

// CUSTOMERS
db.prepare(`
  CREATE TABLE IF NOT EXISTS customers (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT,
    email          TEXT,
    company        TEXT,
    business_name  TEXT,
    business_email TEXT,
    created_at     TEXT,
    last_stage_sent INTEGER DEFAULT 0
  )
`).run();

// CAMPAIGNS
db.prepare(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT,
    day_offset INTEGER,
    subject    TEXT,
    body       TEXT
  )
`).run();

// SENT EMAILS (dedup guard — survives redeploys because /data is persistent)
db.prepare(`
  CREATE TABLE IF NOT EXISTS sent_emails (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    campaign_id INTEGER
  )
`).run();

// TEMPLATES
db.prepare(`
  CREATE TABLE IF NOT EXISTS templates (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT,
    subject    TEXT,
    body       TEXT,
    created_at TEXT
  )
`).run();

// SEND LOGS
db.prepare(`
  CREATE TABLE IF NOT EXISTS send_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    template_id INTEGER,
    status      TEXT,
    sent_at     TEXT
  )
`).run();

// Safe column migrations — ignored if already present
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
    "Welcome to {{business_name}}",
    `Hi {{name}},

Thank you for visiting {{business_name}}. We are glad to have you.

Feel free to reach out anytime if you would like to book your next appointment.

- {{business_name}}`
  );

  ins.run(
    "Follow-up",
    3,
    "Checking in from {{business_name}}",
    `Hi {{name}},

Just checking in — it has been a few days since your visit to {{business_name}}.

We have some availability this week if you would like to come in again. Let me know and I will reserve a slot for you.

- {{business_name}}`
  );

  ins.run(
    "Comeback",
    7,
    "We have a slot for you at {{business_name}}",
    `Hi {{name}},

It has been a while since your last visit to {{business_name}} and we wanted to reach out.

If you are thinking about coming back, we can fit you in this week. Just reply to this email and we will take care of it.

- {{business_name}}`
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
    "Welcome to {{business_name}}",
    `Hi {{name}},

Thank you for visiting {{business_name}}. We are glad to have you as a client.

We look forward to seeing you again. Book your next appointment whenever you are ready.

- {{business_name}}`,
    now
  );

  ins.run(
    "Checking In",
    "Checking in from {{business_name}}",
    `Hi {{name}},

Just wanted to check in — it has been a while since your last visit to {{business_name}}.

If you would like to come back in, we have availability this week. Reply to this email and I will hold a slot for you.

- {{business_name}}`,
    now
  );

  ins.run(
    "Comeback",
    "We saved a slot for you at {{business_name}}",
    `Hi {{name}},

We noticed it has been some time since your visit to {{business_name}}, and we wanted to reach out personally.

If you are thinking about coming back, reply to this and we will get you booked in.

- {{business_name}}`,
    now
  );

  ins.run(
    "Limited Availability",
    "Slots filling up at {{business_name}}",
    `Hi {{name}},

We are getting busy at {{business_name}} this week and wanted to give you first notice before slots fill up.

If you would like to come in, let me know and I will reserve one for you right away.

- {{business_name}}`,
    now
  );
}

module.exports = db;