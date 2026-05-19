const nodemailer = require("nodemailer");

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function money(value) {
  if (value === null || value === undefined || value === "") return "TBD";
  const number = Number(value);
  return Number.isFinite(number) ? `AED ${number.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : String(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function validatePayload(payload) {
  const form = payload.form || {};
  const missing = ["company", "contact", "email", "phone", "deliveryAddress"].filter((key) => !String(form[key] || "").trim());
  if (missing.length) {
    const err = new Error(`Missing required fields: ${missing.join(", ")}`);
    err.statusCode = 400;
    throw err;
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    const err = new Error("No enquiry items were submitted");
    err.statusCode = 400;
    throw err;
  }
}

function buildEmail(payload) {
  const form = payload.form || {};
  const items = payload.items || [];
  const totals = payload.totals || {};
  const plain = [
    "New catalogue enquiry",
    "",
    `Company: ${form.company}`,
    `Contact: ${form.contact}`,
    `Email: ${form.email}`,
    `Phone: ${form.phone}`,
    "",
    "Delivery Address:",
    form.deliveryAddress,
    "",
    "Message:",
    form.message || "-",
    "",
    "Items:",
  ];

  const rows = items.map((item, index) => {
    const details = [
      item.itemCode ? `Code: ${item.itemCode}` : "",
      item.size ? `Size: ${item.size}` : "",
      item.capacity ? `Capacity: ${item.capacity}` : "",
      item.color ? `Preferred Color: ${item.color}` : "",
    ].filter(Boolean);
    plain.push(`${index + 1}. ${item.name} | Qty: ${item.qty} | Unit: ${money(item.unitPrice)} | Total: ${money(item.lineTotal)}`);
    if (details.length) plain.push(`   ${details.join(" | ")}`);
    return `<tr><td>${index + 1}</td><td><strong>${escapeHtml(item.name)}</strong><br>${escapeHtml(details.join(" | "))}</td><td>${escapeHtml(item.qty)}</td><td>${escapeHtml(money(item.unitPrice))}</td><td>${escapeHtml(money(item.lineTotal))}</td></tr>`;
  }).join("");

  plain.push("", `Estimated Total: ${money(totals.grandTotal)}`);

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#222">
    <h2>New catalogue enquiry</h2>
    <p><strong>Company:</strong> ${escapeHtml(form.company)}<br><strong>Contact:</strong> ${escapeHtml(form.contact)}<br><strong>Email:</strong> ${escapeHtml(form.email)}<br><strong>Phone:</strong> ${escapeHtml(form.phone)}</p>
    <p><strong>Delivery Address:</strong><br>${escapeHtml(form.deliveryAddress).replace(/\n/g, "<br>")}</p>
    <p><strong>Message:</strong><br>${escapeHtml(form.message || "-").replace(/\n/g, "<br>")}</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse"><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
    <p><strong>Estimated Total:</strong> ${escapeHtml(money(totals.grandTotal))}</p>
  </body></html>`;

  return {
    from: requiredEnv("SMTP_FROM"),
    to: requiredEnv("ENQUIRY_TO"),
    replyTo: form.email,
    subject: `Catalogue enquiry - ${form.company}`,
    text: plain.join("\n"),
    html,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") {
    const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "ENQUIRY_TO"];
    const missingConfig = required.filter((key) => !process.env[key]);
    return res.status(200).json({ ok: true, message: "Bluestream enquiry email endpoint is running.", emailConfigured: missingConfig.length === 0, missingConfig });
  }
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const payload = req.body || {};
    validatePayload(payload);
    const transporter = nodemailer.createTransport({
      host: requiredEnv("SMTP_HOST"),
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: requiredEnv("SMTP_USER"), pass: requiredEnv("SMTP_PASS") },
    });
    await transporter.sendMail(buildEmail(payload));
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Email send failed:", error);
    return res.status(error.statusCode || 500).json({ ok: false, error: error.statusCode ? error.message : "Email could not be sent" });
  }
};
