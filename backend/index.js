require("dotenv").config();

const express = require("express");
const path    = require("path");
const jwt     = require("jsonwebtoken");
const bcrypt  = require("bcryptjs");
const db      = require("./database");
const app     = express();

const JWT_SECRET  = process.env.JWT_SECRET || "mailbot_jwt_secret_change_in_prod";
const SALT_ROUNDS = 10;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "frontend")));

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Authorization token required." });
  }
  try {
    const decoded  = jwt.verify(header.slice(7), JWT_SECRET);
    const business = await db.getOne(
      "SELECT id, name, email FROM businesses WHERE id = ?",
      [decoded.business_id]
    );
    if (!business) return res.status(401).json({ success: false, error: "Account not found." });
    req.business = business;
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired token." });
  }
}

// ── REGISTER ─────────────────────────────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, error: "name, email and password required." });
    if (password.length < 6)
      return res.status(400).json({ success: false, error: "Password min 6 characters." });

    const exists = await db.getOne("SELECT id FROM businesses WHERE email = ?", [email]);
    if (exists)
      return res.status(409).json({ success: false, error: "Email already registered." });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const { lastInsertRowid: bizId } = await db.execute(
      "INSERT INTO businesses (name, email, password, created_at) VALUES (?,?,?,?)",
      [name, email, hashed, new Date().toISOString()]
    );

    // Seed campaigns
    const now = new Date().toISOString();
    await db.execute(
      "INSERT INTO campaigns (business_id, name, day_offset, subject, body) VALUES (?,?,?,?,?)",
      [bizId, "Welcome", 0,
       "Welcome to {{business_name}}",
       `Hi {{name}},\n\nThank you for visiting {{business_name}}. We are glad to have you.\n\nFeel free to reach out whenever you would like to book your next appointment.\n\n- {{business_name}}`]
    );
    await db.execute(
      "INSERT INTO campaigns (business_id, name, day_offset, subject, body) VALUES (?,?,?,?,?)",
      [bizId, "Follow-up", 3,
       "Checking in from {{business_name}}",
       `Hi {{name}},\n\nJust checking in — it has been a few days since your visit to {{business_name}}.\n\nWe have availability this week if you would like to come back. Let me know and I will reserve a slot.\n\n- {{business_name}}`]
    );
    await db.execute(
      "INSERT INTO campaigns (business_id, name, day_offset, subject, body) VALUES (?,?,?,?,?)",
      [bizId, "Comeback", 7,
       "We have a slot for you at {{business_name}}",
       `Hi {{name}},\n\nIt has been a while since your last visit to {{business_name}} and we wanted to reach out.\n\nIf you are thinking about coming back, reply and we will get you booked in.\n\n- {{business_name}}`]
    );

    // Seed templates
    await db.execute(
      "INSERT INTO templates (business_id, name, subject, body, created_at) VALUES (?,?,?,?,?)",
      [bizId, "Welcome", "Welcome to {{business_name}}",
       `Hi {{name}},\n\nThank you for visiting {{business_name}}. We are glad to have you as a client.\n\nWe look forward to seeing you again soon.\n\n- {{business_name}}`, now]
    );
    await db.execute(
      "INSERT INTO templates (business_id, name, subject, body, created_at) VALUES (?,?,?,?,?)",
      [bizId, "Checking In", "Checking in from {{business_name}}",
       `Hi {{name}},\n\nJust wanted to check in — it has been a while since your last visit to {{business_name}}.\n\nIf you would like to come back, we have availability this week.\n\n- {{business_name}}`, now]
    );
    await db.execute(
      "INSERT INTO templates (business_id, name, subject, body, created_at) VALUES (?,?,?,?,?)",
      [bizId, "Comeback", "We saved a slot for you at {{business_name}}",
       `Hi {{name}},\n\nIt has been some time since your visit to {{business_name}}.\n\nIf you are thinking about coming back, reply and we will get you booked in.\n\n- {{business_name}}`, now]
    );

    const token = jwt.sign({ business_id: bizId, email }, JWT_SECRET, { expiresIn: "30d" });
    console.log(`✅ Registered: ${email} (biz ${bizId})`);
    res.status(201).json({ success: true, token, business: { id: bizId, name, email } });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: "email and password required." });

    const business = await db.getOne("SELECT * FROM businesses WHERE email = ?", [email]);
    if (!business)
      return res.status(401).json({ success: false, error: "Invalid email or password." });

    const valid = await bcrypt.compare(password, business.password);
    if (!valid)
      return res.status(401).json({ success: false, error: "Invalid email or password." });

    const token = jwt.sign(
      { business_id: business.id, email: business.email },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    console.log(`✅ Login: ${email} (biz ${business.id})`);
    res.json({ success: true, token, business: { id: business.id, name: business.name, email: business.email } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

// ── PROTECTED ROUTES ──────────────────────────────────────────────────────────
app.use("/api/customers", requireAuth, require("./customers"));
app.use("/api/templates", requireAuth, require("./templates"));
app.use("/api/broadcast", requireAuth, require("./broadcast"));
app.use("/api/campaigns", requireAuth, require("./campaigns"));

// ── FRONTEND ──────────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api"))
    res.sendFile(path.join(__dirname, "..", "frontend", "dashboard.html"));
});

// ── AUTOMATION SCHEDULER ─────────────────────────────────────────────────────
const runAutomation = require("./automation");
const INTERVAL_MS = parseInt(process.env.AUTOMATION_INTERVAL_MS || "600000", 10);

// First run 5s after startup (allows DB to finish initializing)
setTimeout(async () => {
  try { await runAutomation(); }
  catch (e) { console.error("❌ [scheduler] startup run error:", e.message); }
}, 5000);

// Recurring run
setInterval(async () => {
  try { await runAutomation(); }
  catch (e) { console.error("❌ [scheduler] interval error:", e.message); }
}, INTERVAL_MS);

console.log(`🕐 [scheduler] Automation every ${INTERVAL_MS / 1000}s`);

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server → http://localhost:${PORT}`));