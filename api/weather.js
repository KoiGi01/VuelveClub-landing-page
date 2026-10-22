import { getPosition, getTimes } from 'suncalc';

const USER_AGENT = 'VuelveClub/1.0 (+https://vuelve-club-landing-page.vercel.app/soporte)';
const cache = new Map();
const pending = new Map();
const MINUTE = 60_000;

function coordinate(value, limit) {
  if (typeof value !== 'string' || !/^-?\d+(\.\d+)?$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? Number(number.toFixed(2)) : null;
}

function condition(symbol) {
  if (symbol.includes('thunder')) return 'storm';
  if (symbol.includes('snow') || symbol.includes('sleet')) return 'snow';
  if (symbol.includes('rain')) return 'rain';
  if (symbol === 'fog') return 'fog';
  if (symbol === 'cloudy') return 'cloudy';
  if (symbol === 'partlycloudy' || symbol === 'fair') return 'partly-cloudy';
  if (symbol === 'clearsky') return 'clear';
  return null;
}

async function forecast(lat, lon) {
  const key = `${lat},${lon}`;
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing;
  if (pending.has(key)) return pending.get(key);
  const task = (async () => {
    const headers = { 'User-Agent': USER_AGENT, Accept: 'application/json' };
    if (existing?.modified) headers['If-Modified-Since'] = existing.modified;
    const response = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`, {
      headers, signal: AbortSignal.timeout(7500)
    });
    const expiresHeader = Date.parse(response.headers.get('expires'));
    const expires = Number.isFinite(expiresHeader) && expiresHeader > Date.now()
      ? expiresHeader : Date.now() + 10 * MINUTE;
    if (response.status === 304 && existing) {
      existing.expires = expires;
      return existing;
    }
    if (!response.ok) throw new Error('Weather provider unavailable');
    const json = await response.json();
    const series = json?.properties?.timeseries;
    if (!Array.isArray(series) || !series.length) throw new Error('Missing weather series');
    const data = {
      series: series.slice(0, 36),
      updatedAt: json.properties.meta?.updated_at || new Date().toISOString(),
      modified: response.headers.get('last-modified'), expires
    };
    if (cache.size >= 64 && !cache.has(key)) cache.delete(cache.keys().next().value);
    cache.set(key, data);
    return data;
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}

function cityName(value) {
  if (typeof value !== 'string') return '';
  try { return decodeURIComponent(value).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80); } catch { return ''; }
}

export default async function handler(req, res) {
  // Location-dependent responses must never be shared between visitors by the CDN.
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const query = req.query || {};
  const explicit = query.lat !== undefined || query.lon !== undefined;
  const lat = coordinate(explicit ? query.lat : req.headers?.['x-vercel-ip-latitude'], 90);
  const lon = coordinate(explicit ? query.lon : req.headers?.['x-vercel-ip-longitude'], 180);
  if (lat === null || lon === null) {
    return res.status(explicit ? 400 : 200).json({ ok: false, error: explicit ? 'invalid_location' : 'location_required' });
  }
  try {
    const data = await forecast(lat, lon);
    const now = Date.now();
    const nearest = data.series.reduce((best, item) => {
      const time = Date.parse(item.time);
      return Number.isFinite(time) && Math.abs(time - now) < Math.abs(Date.parse(best.time) - now) ? item : best;
    });
    const forecastTime = Date.parse(nearest.time);
    if (!Number.isFinite(forecastTime) || Math.abs(forecastTime - now) > 2 * 60 * MINUTE) throw new Error('Weather series out of date');
    const temperature = nearest.data?.instant?.details?.air_temperature;
    const summary = nearest.data?.next_1_hours?.summary || nearest.data?.next_6_hours?.summary;
    const symbol = typeof summary?.symbol_code === 'string' ? summary.symbol_code.replace(/_(day|night|polartwilight)$/, '') : '';
    const weather = condition(symbol);
    if (typeof temperature !== 'number' || !Number.isFinite(temperature) || temperature < -100 || temperature > 70 || !weather) throw new Error('Invalid weather data');
    const solar = getPosition(new Date(now), lat, lon);
    const times = getTimes(new Date(now), lat, lon);
    const sunriseAt = times.sunrise?.toISOString() || null;
    const sunsetAt = times.sunset?.toISOString() || null;
    const isDay = sunriseAt && sunsetAt ? now >= times.sunrise.getTime() && now < times.sunset.getTime() : solar.altitude > 0;
    return res.status(200).json({
      ok: true,
      temperature: Math.round(temperature),
      condition: weather,
      isDay,
      phase: isDay ? (solar.altitude < 8 ? 'golden' : 'day') : 'night',
      sunriseAt, sunsetAt,
      location: { label: explicit ? 'Tu ubicación' : cityName(req.headers?.['x-vercel-ip-city']) || 'Tu zona', approximate: !explicit },
      forecastAt: nearest.time,
      updatedAt: data.updatedAt,
      fetchedAt: new Date(now).toISOString(),
      source: 'MET Norway'
    });
  } catch {
    // Never substitute example temperatures or sunny weather when the provider fails.
    return res.status(503).json({ ok: false, error: 'weather_unavailable' });
  }
}
