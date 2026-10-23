import { verifySession } from './session.js';
import { ManagementError } from './management.js';

export function managementHandler(run, { verify = verifySession } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' }); }
    if (req.method === 'POST' && req.headers?.origin && req.headers.origin !== 'https://app.vuelveclub.com') return res.status(403).json({ error: 'FORBIDDEN' });
    let session;
    try { session = await verify(req); } catch { return res.status(401).json({ error: 'SIGN_IN_REQUIRED' }); }
    try {
      if (Number(req.headers?.['content-length']) > 4096) throw new ManagementError('INVALID_REQUEST');
      const body = req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) : {};
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ManagementError('INVALID_REQUEST');
      const query = req.query || {};
      const offset = Number(query.offset || 0);
      if (!Number.isInteger(offset) || offset < 0 || offset > 10000) throw new ManagementError('INVALID_REQUEST');
      return res.status(200).json(await run({ session, body, method: req.method, query, offset }));
    } catch (error) {
      return res.status(error instanceof ManagementError ? error.status : error instanceof SyntaxError ? 400 : 503)
        .json({ error: error instanceof ManagementError ? error.code : error instanceof SyntaxError ? 'INVALID_REQUEST' : 'MANAGEMENT_UNAVAILABLE' });
    }
  };
}
