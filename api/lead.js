import { Resend } from "resend";

const TO = process.env.LEAD_TO_EMAIL || "luismedlozn@gmail.com";
const FROM = process.env.LEAD_FROM_EMAIL || "onboarding@resend.dev";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = new Set(["hero", "demo"]);

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function clean(v) {
  return typeof v === "string" ? v.trim() : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Honeypot: a real user never fills this. Drop silently.
  if (clean(body.company)) return res.status(200).json({ ok: true });

  const source = clean(body.source);
  const email = clean(body.email);
  const nombre = clean(body.nombre);
  const negocio = clean(body.negocio);
  const whatsapp = clean(body.whatsapp);
  const tipo = clean(body.tipo);

  if (!SOURCES.has(source)) {
    return res.status(400).json({ ok: false, error: "Origen inválido" });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: "Correo inválido" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set");
    return res.status(502).json({ ok: false, error: "Configuración de correo faltante" });
  }

  const rows = [
    ["Origen", source === "hero" ? "Formulario hero" : "Formulario demo"],
    ["Correo", email],
    ["Nombre", nombre],
    ["Negocio", negocio],
    ["WhatsApp", whatsapp],
    ["Tipo de negocio", tipo],
  ].filter(([, v]) => v);

  const subject = `Nuevo lead VuelveClub${negocio ? ` — ${negocio}` : ""} (${source})`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const html =
    `<h2 style="font-family:sans-serif">Nuevo lead VuelveClub</h2>` +
    `<table style="font-family:sans-serif;border-collapse:collapse">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#888">${esc(k)}</td>` +
          `<td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`
      )
      .join("") +
    `</table>`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `VuelveClub <${FROM}>`,
      to: [TO],
      replyTo: email,
      subject,
      text,
      html,
    });
    if (error) {
      console.error("Resend error:", error);
      return res.status(502).json({ ok: false, error: "No se pudo enviar el correo" });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Lead handler error:", err);
    return res.status(502).json({ ok: false, error: "No se pudo enviar el correo" });
  }
}
