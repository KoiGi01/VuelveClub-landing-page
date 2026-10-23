const form = document.querySelector("#support-form");
const button = form.querySelector("button[type=submit]");
const status = form.querySelector(".support-status");
let requestId;
form.addEventListener('input', () => { requestId = undefined; });

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (button.disabled) return;

  const data = Object.fromEntries(new FormData(form));
  for (const key of Object.keys(data)) data[key] = data[key].trim();
  requestId ||= crypto.randomUUID();
  data.requestId = requestId;
  if (!data.nombre || !data.email || !data.asunto || !data.mensaje) {
    status.textContent = "Completa los campos obligatorios antes de enviar.";
    status.className = "support-status error";
    return;
  }

  const label = button.innerHTML;
  status.textContent = "Enviando tu solicitud…";
  status.className = "support-status";
  button.disabled = true;
  button.textContent = "Enviando…";
  form.setAttribute("aria-busy", "true");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) throw new Error("Support request failed");
    form.reset();
    requestId = undefined;
    status.textContent = "Recibimos tu solicitud. Te responderemos al correo que nos compartiste.";
  } catch {
    status.textContent = "No pudimos confirmar el envío. Tus datos siguen aquí; intenta de nuevo en unos minutos.";
    status.className = "support-status error";
  } finally {
    clearTimeout(timeout);
    form.removeAttribute("aria-busy");
    button.disabled = false;
    button.innerHTML = label;
  }
});
