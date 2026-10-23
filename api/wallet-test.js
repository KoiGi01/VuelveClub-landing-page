import { verifySession } from '../lib/session.js';
import { createWalletService, validateDesign, WalletError } from '../lib/google-wallet.js';

export function createHandler({ verify = verifySession, wallet = createWalletService() } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }
    if (req.headers?.origin && req.headers.origin !== 'https://app.vuelveclub.com') {
      return res.status(403).json({ error: 'INVALID_ORIGIN' });
    }
    let session;
    try { session = await verify(req); }
    catch { return res.status(401).json({ error: 'SIGN_IN_REQUIRED' }); }
    try {
      if (Number(req.headers?.['content-length']) > 4096) throw new WalletError('INVALID_DESIGN', 400);
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const design = validateDesign(body);
      return res.status(200).json(await wallet.issueTest(session.userId, design));
    } catch (error) {
      if (error instanceof SyntaxError) return res.status(400).json({ error: 'INVALID_DESIGN' });
      return res.status(error instanceof WalletError ? error.status : 503)
        .json({ error: error instanceof WalletError ? error.code : 'GOOGLE_UNAVAILABLE' });
    }
  };
}
export default createHandler();
