require("dotenv").config();

const express = require("express");
const path    = require("path");
const jwt     = require("jsonwebtoken");
const bcrypt  = require("bcrypt");
const db      = require("./database");
const app     = express();

const JWT_SECRET  = process.env.JWT_SECRET || "mailbot_jwt_secret_change_in_prod";
const SALT_ROUNDS = 10;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, "..", "frontend")));

// ── JWT AUTH MIDDLEWARE ───────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Authorization token required." });
  }

  const token = authHeader.slice(7);

  try {
    const decoded  = jwt.verify(token, JWT_SECRET);
    const business = db.prepare("SELECT id, name, email FROM businesses WHERE id = ?").get(decoded.business_id);

    if (!business) {
      return res.status(401).json({ success: false, error: "Account not found." });
    }

    req.business = business;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid or expired token." });
  }
}

// ── PUBLIC AUTH ROUTES (no token required) ────────────────────────────────────

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "name, email and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });
    }

    const existing = db.prepare("SELECT id FROM businesses WHERE email = ?").get(email);
    if (existing) {
      return res.status(409).json({ success: false, error: "An account with this email already exists." });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const result = db.prepare(
      "INSERT INTO businesses (name, email, password, created_at) VALUES (?, ?, ?, ?)"
    ).run(name, email, hashed, new Date().toISOString());

    const bizId = result.lastInsertRowid;

    // Seed default campaigns for this business
    const insCampaign = db.prepare(
      "INSERT INTO campaigns (business_id, name, day_offset, subject, body) VALUES (?,?,?,?,?)"
    );
    insCampaign.run(bizId, "Welcome", 0,
      "Welcome to {{business_name}}",
      `Hi {{name}},\n\nThank you for visiting {{business_name}}. We are glad to have you.\n\nFeel free to reach out whenever you would like to book your next appointment.\n\n- {{business_name}}`
    );
    insCampaign.run(bizId, "Follow-up", 3,
      "Checking in from {{business_name}}",
      `Hi {{name}},\n\nJust checking in — it has been a few days since your visit to {{business_name}}.\n\nWe have availability this week if you would like to come back. Let me know and I will reserve a slot.\n\n- {{business_name}}`
    );
    insCampaign.run(bizId, "Comeback", 7,
      "We have a slot for you at {{business_name}}",
      `Hi {{name}},\n\nIt has been a while since your last visit to {{business_name}} and we wanted to reach out.\n\nIf you are thinking about coming back, reply to this email and we will get you booked in.\n\n- {{business_name}}`
    );

    // Seed default templates for this business
    const insTemplate = db.prepare(
      "INSERT INTO templates (business_id, name, subject, body, created_at) VALUES (?,?,?,?,?)"
    );
    const now = new Date().toISOString();
    insTemplate.run(bizId, "Welcome",
      "Welcome to {{business_name}}",
      `Hi {{name}},\n\nThank you for visiting {{business_name}}. We are glad to have you as a client.\n\nWe look forward to seeing you again soon.\n\n- {{business_name}}`,
      now
    );
    insTemplate.run(bizId, "Checking In",
      "Checking in from {{business_name}}",
      `Hi {{name}},\n\nJust wanted to check in — it has been a while since your last visit to {{business_name}}.\n\nIf you would like to come back, we have availability this week. Reply and I will hold a slot for you.\n\n- {{business_name}}`,
      now
    );
    insTemplate.run(bizId, "Comeback",
      "We saved a slot for you at {{business_name}}",
      `Hi {{name}},\n\nWe noticed it has been some time since your visit to {{business_name}}.\n\nIf you are thinking about coming back, reply to this and we will get you booked in.\n\n- {{business_name}}`,
      now
    );

    const token = jwt.sign({ business_id: bizId, email }, JWT_SECRET, { expiresIn: "30d" });
    console.log(`✅ Registered: ${email} (biz ${bizId})`);

    res.status(201).json({
      success:  true,
      token,
      business: { id: bizId, name, email },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "email and password are required." });
    }

    const business = db.prepare("SELECT * FROM businesses WHERE email = ?").get(email);
    if (!business) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(password, business.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { business_id: business.id, email: business.email },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    console.log(`✅ Login: ${email} (biz ${business.id})`);

    res.json({
      success:  true,
      token,
      business: { id: business.id, name: business.name, email: business.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── HEALTH (public) ───────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ── PROTECTED API ROUTES — all require valid JWT ──────────────────────────────
app.use("/api/customers", requireAuth, require("./customers"));
app.use("/api/templates", requireAuth, require("./templates"));
app.use("/api/broadcast", requireAuth, require("./broadcast"));
app.use("/api/campaigns", requireAuth, require("./campaigns"));

// ── CATCH-ALL — always serve dashboard.html for non-API routes ────────────────
// The frontend JS handles the login/dashboard split, not the server.
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "..", "frontend", "dashboard.html"));
  }
});

// ── AUTOMATION ────────────────────────────────────────────────────────────────
const runAutomation = require("./automation");

setTimeout(async () => {
  try { await runAutomation(); } catch (e) { console.error("Automation error:", e.message); }
}, 2000);

setInterval(async () => {
  try { await runAutomation(); } catch (e) { console.error("Automation error:", e.message); }
}, 60000);

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running → http://localhost:${PORT}`));