const sqlite3 = require("sqlite3").verbose();
const path    = require("path");
const fs      = require("fs");

const DB_DIR  = process.env.DB_DIR || path.join(__dirname, "..");
const DB_PATH = path.join(DB_DIR, "mailbot.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ Database connection error:", err.message);
  } else {
    console.log("🗄️  Connected to SQLite database at:", DB_PATH);
  }
});

// Helper for Promisified queries to keep the async/await logic in routes
db.query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

db.getOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.execute = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
    });
  });
};

// ── INITIALIZE TABLES ────────────────────────────────────────────────────────
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS businesses (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      created_at TEXT    NOT NULL
    )
  `);

  db.run(`
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
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL DEFAULT 0,
      name        TEXT,
      day_offset  INTEGER,
      subject     TEXT,
      body        TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS templates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL DEFAULT 0,
      name        TEXT,
      subject     TEXT,
      body        TEXT,
      created_at  TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sent_emails (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL DEFAULT 0,
      customer_id INTEGER,
      campaign_id INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS send_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL DEFAULT 0,
      customer_id INTEGER,
      template_id INTEGER,
      status      TEXT,
      sent_at     TEXT
    )
  `);

  // Safe Migrations
  const columns = [
    ["customers", "business_id", "INTEGER NOT NULL DEFAULT 0"],
    ["customers", "business_name", "TEXT"],
    ["customers", "business_email", "TEXT"],
    ["campaigns", "business_id", "INTEGER NOT NULL DEFAULT 0"],
    ["templates", "business_id", "INTEGER NOT NULL DEFAULT 0"],
    ["sent_emails", "business_id", "INTEGER NOT NULL DEFAULT 0"],
    ["send_logs", "business_id", "INTEGER NOT NULL DEFAULT 0"],
    ["send_logs", "template_id", "INTEGER"],
    ["send_logs", "status", "TEXT"],
    ["send_logs", "sent_at", "TEXT"]
  ];

  columns.forEach(([table, col, type]) => {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, (err) => {
      // Ignore error if column already exists
    });
  });
});

module.exports = db;