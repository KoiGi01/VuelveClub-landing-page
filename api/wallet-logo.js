import { verifySession } from '../lib/session.js';
import { createLogoService, LogoError } from '../lib/business-logo.js';

export function createHandler({ verify = verifySession, logos = createLogoService() } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' }); }
    if (req.headers?.origin && req.headers.origin !== 'https://app.vuelveclub.com') return res.status(403).json({ error: 'INVALID_ORIGIN' });
    let session;
    try { session = await verify(req); } catch { return res.status(401).json({ error: 'SIGN_IN_REQUIRED' }); }
    try {
      if (Number(req.headers?.['content-length']) > 2900000) throw new LogoError('IMAGE_TOO_LARGE');
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      return res.status(200).json(await logos.upload(session.userId, body?.image));
    } catch (error) {
      if (error instanceof SyntaxError) return res.status(400).json({ error: 'INVALID_IMAGE' });
      return res.status(error instanceof LogoError ? error.status : 503)
        .json({ error: error instanceof LogoError ? error.code : 'LOGO_UPLOAD_FAILED' });
    }
  };
}
export default createHandler();
