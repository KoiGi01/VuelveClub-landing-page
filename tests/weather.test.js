import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import handler from '../api/weather.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
async function request(query = {}, headers = {}, method = 'GET') {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method, query, headers }, res);
  return res;
}
function provider(symbol = 'clearsky_day', temp = 29, time = new Date().toISOString()) {
  return { properties: { meta: { updated_at: time }, timeseries: [{ time, data: { instant: { details: { air_temperature: temp } }, next_1_hours: { summary: { symbol_code: symbol } } } }] } };
}
function response(data, options = {}) {
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json', Expires: new Date(Date.now() + 600_000).toUTCString(), ...options } });
}

test('weather only accepts GET and never publicly caches visitor location', async () => {
  globalThis.fetch = () => { throw new Error('Must not fetch'); };
  const res = await request({}, {}, 'POST');
  assert.equal(res.code, 405);
  assert.equal(res.headers.Allow, 'GET');
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
});

test('weather asks for location rather than guessing one; invalid coordinates never reach upstream', async () => {
  let calls = 0; globalThis.fetch = () => { calls++; throw new Error('Must not fetch'); };
  assert.deepEqual((await request()).body, { ok: false, error: 'location_required' });
  for (const query of [{ lat: '91', lon: '0' }, { lat: '0', lon: '-181' }, { lat: '', lon: '' }, { lat: '  ', lon: '0' }, { lat: 'NaN', lon: '0' }, { lat: '1' }, { lat: ['1', '2'], lon: '0' }, { lat: 'http://localhost', lon: '0' }]) {
    assert.equal((await request(query)).code, 400);
  }
  assert.equal(calls, 0);
});

test('weather uses approximate Vercel location, decodes the city and identifies its upstream requests', async () => {
  let url, options;
  globalThis.fetch = async (u, o) => { url = u; options = o; return response(provider()); };
  const res = await request({}, { 'x-vercel-ip-latitude': '20.9674321', 'x-vercel-ip-longitude': '-89.5927123', 'x-vercel-ip-city': 'M%C3%A9rida' });
  assert.equal(res.code, 200);
  assert.equal(url, 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=20.97&lon=-89.59');
  assert.ok(options.headers['User-Agent'].includes('VuelveClub/1.0'));
  assert.ok(options.signal);
  assert.equal(res.body.temperature, 29);
  assert.equal(res.body.condition, 'clear');
  assert.deepEqual(res.body.location, { label: 'Mérida', approximate: true });
  assert.equal(res.body.source, 'MET Norway');
  assert.equal(Object.hasOwn(res.body, 'latitude'), false);
});

test('weather accepts the equator and zero longitude, and distinguishes shared device location', async () => {
  globalThis.fetch = async () => response(provider('lightrainshowers_night', 22.8));
  const res = await request({ lat: '0', lon: '0' }, { 'x-vercel-ip-city': 'Other city' });
  assert.equal(res.code, 200);
  assert.equal(res.body.temperature, 23);
  assert.equal(res.body.condition, 'rain');
  assert.deepEqual(res.body.location, { label: 'Tu ubicación', approximate: false });
});

test('weather maps clouds, fog, snow and storms without depending on a day/night suffix', async () => {
  const cases = [['partlycloudy_day', 'partly-cloudy'], ['fair_night', 'partly-cloudy'], ['cloudy', 'cloudy'], ['fog', 'fog'], ['heavysnow', 'snow'], ['sleetshowers_day', 'snow'], ['rainandthunder', 'storm']];
  for (let i = 0; i < cases.length; i++) {
    globalThis.fetch = async () => response(provider(cases[i][0]));
    assert.equal((await request({ lat: String(30 + i), lon: '30' })).body.condition, cases[i][1]);
  }
});

test('weather day/night follows the actual solar position, even when the forecast symbol says otherwise', async t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-10-22T18:00:00Z'));
  globalThis.fetch = async () => response(provider('clearsky_night', 28, new Date(Date.now()).toISOString()));
  const day = await request({ lat: '20.96', lon: '-89.60' });
  assert.equal(day.body.isDay, true);
  assert.equal(day.body.phase, 'day');
  assert.ok(Date.parse(day.body.sunriseAt) < Date.now());
  assert.ok(Date.parse(day.body.sunsetAt) > Date.now());
  t.mock.method(Date, 'now', () => Date.parse('2026-10-23T06:00:00Z'));
  globalThis.fetch = async () => response(provider('clearsky_day', 24, new Date(Date.now()).toISOString()));
  const night = await request({ lat: '20.95', lon: '-89.60' });
  assert.equal(night.body.isDay, false);
  assert.equal(night.body.phase, 'night');
});

test('weather reuses unexpired forecasts, coalesces requests and revalidates expired data', async t => {
  const now = Date.now(); let calls = 0; let conditional;
  t.mock.method(Date, 'now', () => now);
  globalThis.fetch = async (_, options) => {
    calls++;
    if (calls > 1) { conditional = options.headers['If-Modified-Since']; return new Response(null, { status: 304 }); }
    await Promise.resolve();
    return response(provider('cloudy'), { 'Last-Modified': new Date(now).toUTCString() });
  };
  const query = { lat: '18', lon: '-88' };
  const first = await Promise.all([request(query), request(query)]);
  assert.ok(first.every(r => r.body.ok));
  await request(query); assert.equal(calls, 1);
  t.mock.method(Date, 'now', () => now + 660_000);
  assert.equal((await request(query)).body.ok, true);
  assert.equal(calls, 2);
  assert.equal(conditional, new Date(now).toUTCString());
});

test('weather never returns made-up conditions after upstream failures or malformed/stale data', async () => {
  const invalid = [() => Promise.reject(new Error('timeout')), () => new Response('', { status: 429 }), () => response({}), () => response(provider('unknown')), () => response(provider('clearsky_day', '29')), () => response(provider('clearsky_day', 25, 'invalid')), () => response(provider('clearsky_day', 25, '2020-01-01T00:00:00Z'))];
  for (let i = 0; i < invalid.length; i++) {
    globalThis.fetch = invalid[i];
    const res = await request({ lat: String(40 + i), lon: '30' });
    assert.equal(res.code, 503);
    assert.deepEqual(res.body, { ok: false, error: 'weather_unavailable' });
  }
});
