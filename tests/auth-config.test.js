import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import handler from '../api/auth-config.js';
const original = { key: process.env.CLERK_PUBLISHABLE_KEY, environment: process.env.VERCEL_ENV };
afterEach(() => {
  for (const [key, value] of [['CLERK_PUBLISHABLE_KEY', original.key], ['VERCEL_ENV', original.environment]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
function request(method = 'GET') {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  handler({ method }, res); return res;
}
test('auth config fails closed and never exposes a secret or a development key in production', () => {
  process.env.VERCEL_ENV = 'production';
  for (const key of ['', 'sk_live_not_public', 'pk_test_ZXhhbXBsZS5jb20k']) {
    process.env.CLERK_PUBLISHABLE_KEY = key;
    assert.deepEqual(request().body, { enabled: false });
  }
  process.env.CLERK_PUBLISHABLE_KEY = 'pk_live_ZXhhbXBsZS5jb20k';
  assert.equal(request().body.enabled, true);
  assert.equal(request().headers['Cache-Control'], 'no-store');
  assert.equal(request('POST').code, 405);
});
