import { createHash } from 'node:crypto';
import { importPKCS8, SignJWT } from 'jose';
import { verifyLogo } from './business-logo.js';

const API = 'https://walletobjects.googleapis.com/walletobjects/v1';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ORIGIN = 'https://app.vuelveclub.com';
export class WalletError extends Error {
  constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}

export function validateDesign(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new WalletError('INVALID_DESIGN', 400);
  const text = (value, max) => {
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f<>]/.test(value)) {
      throw new WalletError('INVALID_DESIGN', 400);
    }
    return value.trim().replace(/\s+/g, ' ');
  };
  if (![5, 8, 10, 12].includes(input.goal) || !/^#[\da-f]{6}$/i.test(input.color || '')) {
    throw new WalletError('INVALID_DESIGN', 400);
  }
  const design = { business: text(input.business, 60), reward: text(input.reward, 60), goal: input.goal, color: input.color.toUpperCase() };
  if (input.logoToken !== undefined && input.logoToken !== '') {
    if (typeof input.logoToken !== 'string' || input.logoToken.length > 2048) throw new WalletError('INVALID_LOGO', 400);
    design.logoToken = input.logoToken;
  }
  return design;
}

export function stampImage(goal, color) {
  const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  const tone = .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2] > .179 ? 'dark' : 'light';
  return `https://www.vuelveclub.com/assets/wallet/stamps-${goal}-${tone}.png`;
}

export function createWalletService({ env = process.env, request = fetch } = {}) {
  let cachedToken;
  async function configuration() {
    try {
      const credentials = JSON.parse(env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON);
      const issuer = env.GOOGLE_WALLET_ISSUER_ID;
      if (!/^\d+$/.test(issuer || '') || credentials.type !== 'service_account' ||
          !/^[^@]+@[^@]+\.iam\.gserviceaccount\.com$/.test(credentials.client_email)) throw new Error();
      return { issuer, email: credentials.client_email, keyId: credentials.private_key_id,
        key: await importPKCS8(credentials.private_key, 'RS256') };
    } catch { throw new WalletError('NOT_CONFIGURED'); }
  }
  async function accessToken(config) {
    if (cachedToken && cachedToken.expires > Date.now() + 60000) return cachedToken.value;
    const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/wallet_object.issuer' })
      .setProtectedHeader({ alg: 'RS256', kid: config.keyId }).setIssuer(config.email)
      .setAudience(TOKEN_URL).setIssuedAt().setExpirationTime('5m').sign(config.key);
    const response = await request(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(12000) });
    const body = await response.json();
    if (!response.ok || !body.access_token) throw new WalletError('GOOGLE_AUTH_FAILED');
    cachedToken = { value: body.access_token, expires: Date.now() + Math.min(Number(body.expires_in) || 300, 3600) * 1000 };
    return cachedToken.value;
  }
  async function ensureResource(type, resource, token) {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const existing = await request(`${API}/${type}/${resource.id}`, { headers, signal: AbortSignal.timeout(12000) });
    if (existing.ok) return;
    if (existing.status !== 404) throw new WalletError(existing.status === 403 ? 'GOOGLE_ACCESS_DENIED' : 'GOOGLE_UNAVAILABLE');
    const created = await request(`${API}/${type}`, { method: 'POST', headers, body: JSON.stringify(resource), signal: AbortSignal.timeout(12000) });
    // A concurrent identical request may have created the same immutable resource.
    if (!created.ok && created.status !== 409) throw new WalletError(created.status === 403 ? 'GOOGLE_ACCESS_DENIED' : 'GOOGLE_CREATE_FAILED');
  }
  return {
    async issueTest(userId, input) {
      const design = validateDesign(input);
      const config = await configuration();
      let logoUrl = 'https://www.vuelveclub.com/assets/logo-mark.png';
      if (design.logoToken) {
        try { logoUrl = await verifyLogo(design.logoToken, userId, env); }
        catch { throw new WalletError('INVALID_LOGO', 400); }
      }
      const { logoToken, ...identity } = design;
      // Owner + full design determine immutable resource IDs. Never accept IDs from a browser.
      const suffix = createHash('sha256').update(JSON.stringify([userId, identity, logoUrl])).digest('hex').slice(0, 32);
      const classId = `${config.issuer}.vc_test_v3_${suffix}`;
      const objectId = `${config.issuer}.vc_test_card_v3_${suffix}`;
      const loyaltyClass = {
        id: classId, issuerName: design.business, programName: 'Recompensas · Prueba',
        programLogo: { sourceUri: { uri: logoUrl },
          contentDescription: { defaultValue: { language: 'es-MX', value: `Logo de ${design.business}` } } },
        reviewStatus: 'UNDER_REVIEW', hexBackgroundColor: design.color,
        heroImage: { sourceUri: { uri: stampImage(design.goal, design.color) },
          contentDescription: { defaultValue: { language: 'es-MX', value: `0 de ${design.goal} estampas. Corazones por completar.` } } },
        accountNameLabel: 'Cliente', accountIdLabel: 'Tarjeta de prueba', countryCode: 'MX',
        textModulesData: [
          { id: 'reward', header: 'Tu recompensa', body: `${design.goal} visitas: ${design.reward}` },
          { id: 'test_notice', header: 'Solo para probar el diseño', body: 'Tarjeta de prueba sin valor comercial. No registra compras ni genera recompensas reales.\nPowered by vuelveclub.' }
        ]
      };
      const loyaltyObject = {
        id: objectId, classId, state: 'ACTIVE', accountName: 'Alex Demo', accountId: 'PRUEBA',
        loyaltyPoints: { label: 'Visitas', balance: { string: `0 / ${design.goal}` } },
        barcode: { type: 'QR_CODE', value: `VC-TEST-${suffix}`, alternateText: 'PRUEBA · Sin valor comercial' }
      };
      const token = await accessToken(config);
      await ensureResource('loyaltyClass', loyaltyClass, token);
      await ensureResource('loyaltyObject', loyaltyObject, token);
      // Referencing the saved object keeps the JWT and scannable QR compact.
      const jwt = await new SignJWT({ typ: 'savetowallet', origins: [ORIGIN], payload: { loyaltyObjects: [{ id: objectId }] } })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: config.keyId })
        .setIssuer(config.email).setAudience('google').setIssuedAt().setExpirationTime('24h').sign(config.key);
      return { saveUrl: `https://pay.google.com/gp/v/save/${jwt}`, expiresAt: new Date(Date.now() + 86400000).toISOString(),
        classId, objectId, testOnly: true };
    }
  };
}
