import { Resend } from "resend";

const TO = process.env.SUPPORT_TO_EMAIL || "luismedlozn@gmail.com";
const FROM = process.env.LEAD_FROM_EMAIL || "onboarding@resend.dev";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));
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

  // Honeypot: bots are acknowledged without sending a notification.
  if (clean(body.company)) return res.status(200).json({ ok: true });

  const nombre = clean(body.nombre, 120);
  const email = clean(body.email, 254);
  const negocio = clean(body.negocio, 160);
  const asunto = clean(body.asunto, 160);
  const mensaje = clean(body.mensaje, 5000);

  if (!nombre || !EMAIL_RE.test(email) || !asunto || !mensaje) {
    return res.status(400).json({ ok: false, error: "Completa los campos requeridos con un correo válido" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set");
    return res.status(502).json({ ok: false, error: "Configuración de correo faltante" });
  }

  const rows = [
    ["Nombre", nombre],
    ["Correo", email],
    ["Negocio", negocio],
    ["Asunto", asunto],
  ].filter(([, value]) => value);
  const text = [
    "Nuevo ticket de soporte de VuelveClub",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "Problema:",
    mensaje,
  ].join("\n");
  const html =
    '<h2 style="font-family:sans-serif">Nuevo ticket de soporte</h2>' +
    '<table style="font-family:sans-serif;border-collapse:collapse">' +
    rows.map(([label, value]) =>
      `<tr><td style="padding:4px 12px 4px 0;color:#666">${esc(label)}</td>` +
      `<td style="padding:4px 0"><b>${esc(value)}</b></td></tr>`
    ).join("") +
    "</table>" +
    '<h3 style="font-family:sans-serif;margin:20px 0 6px">Problema</h3>' +
    `<p style="font-family:sans-serif;white-space:pre-wrap">${esc(mensaje)}</p>`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `VuelveClub Soporte <${FROM}>`,
      to: [TO],
      replyTo: email,
      subject: `Soporte VuelveClub — ${asunto}`,
      text,
      html,
    });
    if (error) {
      console.error("Resend support error:", error);
      return res.status(502).json({ ok: false, error: "No se pudo enviar el ticket" });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Support handler error:", error);
    return res.status(502).json({ ok: false, error: "No se pudo enviar el ticket" });
  }
}
