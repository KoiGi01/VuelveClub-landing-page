export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ enabled: false });
  }
  const publishableKey = (process.env.CLERK_PUBLISHABLE_KEY || '').trim();
  const valid = /^pk_(test|live)_[A-Za-z0-9+/=]+$/.test(publishableKey);
  if (!valid || (process.env.VERCEL_ENV === 'production' && !publishableKey.startsWith('pk_live_'))) {
    return res.status(200).json({ enabled: false });
  }
  return res.status(200).json({ enabled: true, publishableKey });
}
