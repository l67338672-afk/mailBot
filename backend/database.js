const fs       = require("fs");
const path     = require("path");
const Database = require("better-sqlite3");

const DB_DIR  = process.env.DB_DIR || "/data";
const DB_PATH = path.join(DB_DIR, "mailbot.db");

try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log(`📁 Created DB directory: ${DB_DIR}`);
  }
} catch (err) {
  console.error(`❌ Could not create DB directory (${DB_DIR}):`, err.message);
}

const db = new Database(fs.existsSync(DB_DIR) ? DB_PATH : "mailbot.db");
console.log("🗄️  Database path:", db.name);

// ── BUSINESSES ───────────────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS businesses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    created_at TEXT    NOT NULL
  )
`).run();

// ── CUSTOMERS ────────────────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS customers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id     INTEGER NOT NULL DEFAULT 0,
    name            TEXT,
    email           TEXT,
    company         TEXT,
    business_name   TEXT,
    business_email  TEXT,
    created_at      TEXT,
    last_stage_sent INTEGER DEFAULT 0
  )
`).run();

// ── CAMPAIGNS ────────────────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL DEFAULT 0,
    name        TEXT,
    day_offset  INTEGER,
    subject     TEXT,
    body        TEXT
  )
`).run();

// ── TEMPLATES ────────────────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL DEFAULT 0,
    name        TEXT,
    subject     TEXT,
    body        TEXT,
    created_at  TEXT
  )
`).run();

// ── SENT EMAILS ──────────────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS sent_emails (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL DEFAULT 0,
    customer_id INTEGER,
    campaign_id INTEGER
  )
`).run();

// ── SEND LOGS ────────────────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS send_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL DEFAULT 0,
    customer_id INTEGER,
    template_id INTEGER,
    status      TEXT,
    sent_at     TEXT
  )
`).run();

// ── SAFE MIGRATIONS ──────────────────────────────────────────────────────────
for (const sql of [
  "ALTER TABLE customers   ADD COLUMN business_id    INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE customers   ADD COLUMN business_name  TEXT",
  "ALTER TABLE customers   ADD COLUMN business_email TEXT",
  "ALTER TABLE campaigns   ADD COLUMN business_id    INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE templates   ADD COLUMN business_id    INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE sent_emails ADD COLUMN business_id    INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE send_logs   ADD COLUMN business_id    INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE send_logs   ADD COLUMN template_id    INTEGER",
  "ALTER TABLE send_logs   ADD COLUMN status         TEXT",
  "ALTER TABLE send_logs   ADD COLUMN sent_at        TEXT",
]) {
  try { db.prepare(sql).run(); } catch (_) {}
}

module.exports = db;