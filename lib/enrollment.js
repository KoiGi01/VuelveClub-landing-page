import { createHash, createHmac } from 'node:crypto';
import { createDatabase, DatabaseError } from './database.js';
import { createWalletService } from './google-wallet.js';

const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export function validateRegistration(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !uuid(input.slug) || !uuid(input.designId) ||
      typeof input.token !== 'string' || !/^[a-f0-9]{64}$/.test(input.token) || input.termsAccepted !== true ||
      typeof input.termsVersion !== 'string' || !input.termsVersion || input.termsVersion.length > 100 || input.website) throw new DatabaseError('INVALID_REQUEST', 400);
  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const raw = typeof input.phone === 'string' ? input.phone.trim() : '';
  const digits = raw.replace(/\D/g, '');
  const phone = /^\d{10}$/.test(digits) && !raw.startsWith('+') ? `+52${digits}` : `+${digits}`;
  if (!name || name.length > 120 || /[<>\x00-\x1f]/.test(name) || email.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email) ||
      !/^[+\d\s().-]+$/.test(raw) || !/^\+[1-9]\d{6,14}$/.test(phone) || (!raw.startsWith('+') && ![10, 12].includes(digits.length)) ||
      (!raw.startsWith('+') && digits.length === 12 && !digits.startsWith('52'))) throw new DatabaseError('INVALID_REQUEST', 400);
  return { name, email, phone };
}

export function createEnrollment({ database = createDatabase(), wallet = createWalletService(), env = process.env } = {}) {
  return {
    async profile(slug) {
      if (!uuid(slug)) throw new DatabaseError('PROGRAM_NOT_FOUND', 404);
      const d = await database.publicProgram(slug);
      return { id: d.id, name: d.name, reward: d.reward, goal: d.visit_goal, color: d.background_color, logoUrl: d.logo_url,
        termsUrl: d.terms_url, privacyUrl: d.privacy_url, termsVersion: d.terms_version };
    },
    async register(input, ip) {
      const person = validateRegistration(input);
      if (!env.SUPABASE_SECRET_KEY || !ip) throw new DatabaseError('REGISTRATION_UNAVAILABLE');
      const bucket = createHmac('sha256', env.SUPABASE_SECRET_KEY).update(`enrollment:${ip}`).digest('hex');
      if (!await database.rpc('vc_enrollment_rate', { p_bucket: bucket })) throw new DatabaseError('TRY_AGAIN_LATER', 429);
      const fingerprint = createHash('sha256').update(JSON.stringify([person.name, person.email, person.phone, input.designId, input.termsVersion])).digest('hex');
      const token = createHash('sha256').update(input.token).digest('hex');
      const member = await database.rpc('vc_enroll', { p_slug: input.slug, p_token: token, p_fingerprint: fingerprint,
        p_design: input.designId, p_name: person.name, p_email: person.email, p_phone: person.phone, p_terms: input.termsVersion });
      // If Google is unavailable the committed registration survives; same-token
      // retry returns the same customer/card without overwriting personal data.
      return wallet.issueMember(member);
    }
  };
}
