const express = require("express");
const router = express.Router();
const db = require("./db");

function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
}

router.post("/", async (req, res) => {
  const { templateId, customerIds } = req.body;

  const template = db.getTemplateById(Number(templateId));
  if (!template) {
    return res.status(404).json({ error: "Template not found" });
  }

  const customers = db.getCustomers();

  const targets = customerIds?.length
    ? customers.filter(c => customerIds.includes(c.id))
    : customers;

  const results = [];

  for (const customer of targets) {
    const vars = {
      name: customer.name,
      email: customer.email,
      company: customer.company || ""
    };

    const subject = interpolate(template.subject, vars);
    const body = interpolate(template.body, vars);

    console.log("📧 Preview send:", customer.email, subject);

    db.logSend({
      customer_id: customer.id,
      template_id: template.id,
      status: "preview"
    });

    results.push({ email: customer.email, status: "preview" });
  }

  res.json({
    success: true,
    total: results.length,
    results
  });
});

module.exports = router;