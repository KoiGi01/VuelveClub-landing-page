// Shared UX classification and validation. No contact details are sent to Gemini.
export const assistantName = 'Mía';
export function isSalesQuestion(text) {
  const value = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\b(factur\w*|reembolso|cancel\w*|cobro|ya soy cliente|no me interesa)\b/.test(value)) return false;
  if (/\b(no puedo|no funciona|error|recuperar|contrasena|permiso)\b/.test(value)) return false;
  if (/\b(no quiero|no necesito)\b.*\b(precio|demo|contratar|informacion)\b/.test(value)) return false;
  return /\b(precios?|costos?|cuesta|coste|cost|pricing|price|planes|plan de pago|demo|demostracion|contratar|cotiza\w*|presupuesto|suscrib\w*)\b/.test(value)
    || /\b(me interesa|quiero (mas )?(informacion|info)|para mi negocio|for my business|interested in|send me (more )?info)\b/.test(value);
}
export function normalizePhone(value) {
  if (typeof value !== 'string' || !/^[+\d\s().-]+$/.test(value.trim())) return null;
  const raw = value.trim(), digits = raw.replace(/\D/g, '');
  if (!raw.startsWith('+') && digits.length === 10) return `+52${digits}`;
  if (!raw.startsWith('+') && digits.length === 12 && digits.startsWith('52')) return `+${digits}`;
  if (raw.startsWith('+') && /^[1-9]\d{6,14}$/.test(digits)) return `+${digits}`;
  return null;
}
export function chatVisible({ hostname, pathname }) {
  const path = pathname.replace(/\/$/, '') || '/';
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  return (['www.vuelveclub.com', 'vuelveclub.com'].includes(hostname) || local) && ['/', '/index.html'].includes(path)
    || (hostname === 'app.vuelveclub.com' || local) && ['/admin', '/equipo', '/dashboard/index.html'].includes(path);
}
