import { createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import sharp from 'sharp';
import { put } from '@vercel/blob';

const MAX_BYTES = 2 * 1024 * 1024;
export class LogoError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
function signingKey(env) {
  try {
    const credentials = JSON.parse(env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON);
    if (!credentials.private_key) throw new Error();
    return createHash('sha256').update('vuelveclub:business-logo:v1\0').update(credentials.private_key).digest();
  } catch { throw new LogoError('LOGO_NOT_CONFIGURED', 503); }
}
export const ownerPrefix = userId => createHash('sha256').update(userId).digest('hex').slice(0, 32);
function safeLogoUrl(value, userId) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && /^[a-z0-9]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname) &&
      !url.username && !url.password && !url.port && !url.search && !url.hash &&
      new RegExp(`^/business-logos/${ownerPrefix(userId)}/[a-f0-9]{64}\\.png$`).test(url.pathname);
  } catch { return false; }
}
export async function verifyLogo(token, userId, env = process.env) {
  try {
    const { payload } = await jwtVerify(token, signingKey(env), {
      issuer: 'vuelveclub:business-logo', audience: 'wallet-design', subject: userId, algorithms: ['HS256'],
      requiredClaims: ['sub', 'exp', 'iat']
    });
    if (!safeLogoUrl(payload.url, userId)) throw new Error();
    return payload.url;
  } catch { throw new LogoError('INVALID_LOGO'); }
}
export function createLogoService({ env = process.env, store = put } = {}) {
  return {
    async upload(userId, base64) {
      const key = signingKey(env);
      if (!env.BLOB_STORE_ID && !env.BLOB_READ_WRITE_TOKEN) throw new LogoError('LOGO_NOT_CONFIGURED', 503);
      if (typeof base64 !== 'string' || !base64.length || base64.length > Math.ceil(MAX_BYTES / 3) * 4 ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new LogoError('INVALID_IMAGE');
      const bytes = Buffer.from(base64, 'base64');
      if (bytes.length > MAX_BYTES) throw new LogoError('IMAGE_TOO_LARGE');
      let png;
      try {
        const image = sharp(bytes, { limitInputPixels: 20000000, animated: false, failOn: 'warning' });
        const metadata = await image.metadata();
        if (!['png', 'jpeg', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error();
        png = await image.rotate().resize(700, 700, { fit: 'contain', background: '#F9F7EF' })
          .extend({ top: 150, bottom: 150, left: 150, right: 150, background: '#F9F7EF' }).png().toBuffer();
      } catch { throw new LogoError('INVALID_IMAGE'); }
      const hash = createHash('sha256').update(png).digest('hex');
      let blob;
      try {
        blob = await store(`business-logos/${ownerPrefix(userId)}/${hash}.png`, png, {
          access: 'public', contentType: 'image/png', addRandomSuffix: false, allowOverwrite: true,
          cacheControlMaxAge: 31536000, ...(env.BLOB_STORE_ID ? { storeId: env.BLOB_STORE_ID } : {}),
          ...(env.VERCEL_OIDC_TOKEN ? { oidcToken: env.VERCEL_OIDC_TOKEN } : {}),
          ...(env.BLOB_READ_WRITE_TOKEN ? { token: env.BLOB_READ_WRITE_TOKEN } : {}),
          abortSignal: AbortSignal.timeout(20000)
        });
      } catch { throw new LogoError('LOGO_UPLOAD_FAILED', 503); }
      if (!safeLogoUrl(blob.url, userId)) throw new LogoError('LOGO_UPLOAD_FAILED', 503);
      const token = await new SignJWT({ url: blob.url }).setProtectedHeader({ alg: 'HS256' })
        .setIssuer('vuelveclub:business-logo').setAudience('wallet-design').setSubject(userId)
        .setIssuedAt().setExpirationTime('365d').sign(key);
      return { logoUrl: blob.url, logoToken: token, width: 1000, height: 1000 };
    }
  };
}
