// Only the public ingestion token is exposed. Never use a personal API key here.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ enabled: false });
  }
  const token = (process.env.POSTHOG_PROJECT_TOKEN || '').trim();
  const region = process.env.POSTHOG_REGION || 'US';
  if (process.env.VERCEL_ENV !== 'production' || !/^phc_[a-zA-Z0-9_-]+$/.test(token) || !['US', 'EU'].includes(region)) {
    return res.status(200).json({ enabled: false });
  }
  return res.status(200).json({ enabled: true, token, region });
}
