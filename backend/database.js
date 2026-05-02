const Database = require("better-sqlite3");

const db = new Database("mailbot.db");

db.exec(`
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  company TEXT,
  created_at TEXT,
  last_stage_sent INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS send_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  template_id INTEGER,
  status TEXT,
  created_at TEXT
);
`);

module.exports = db;