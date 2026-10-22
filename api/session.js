import { verifySession } from '../lib/session.js';

export function createHandler(verify = verifySession) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      return res.status(200).json(await verify(req));
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}
export default createHandler();
