import { createEnrollment } from '../lib/enrollment.js';
import { DatabaseError } from '../lib/database.js';
import { WalletError } from '../lib/google-wallet.js';

export function createHandler({ service = createEnrollment() } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' }); }
    if (req.method === 'POST' && !['https://app.vuelveclub.com', 'https://www.vuelveclub.com', 'https://vuelveclub.com'].includes(req.headers?.origin)) return res.status(403).json({ error: 'INVALID_ORIGIN' });
    try {
      if (req.method === 'GET') return res.status(200).json(await service.profile(req.query?.slug));
      if (Number(req.headers?.['content-length']) > 4096) throw new DatabaseError('INVALID_REQUEST', 400);
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (JSON.stringify(body || '').length > 4096) throw new DatabaseError('INVALID_REQUEST', 400);
      const forwarded = req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for'];
      const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress;
      return res.status(200).json(await service.register(body, ip));
    } catch (error) {
      const known = error instanceof DatabaseError || error instanceof WalletError;
      return res.status(error instanceof SyntaxError ? 400 : known ? error.status : 503).json({ error: error instanceof SyntaxError ? 'INVALID_REQUEST' : error instanceof WalletError ? 'WALLET_PENDING' : known ? error.code : 'REGISTRATION_UNAVAILABLE' });
    }
  };
}
export default createHandler();
