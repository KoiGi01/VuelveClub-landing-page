import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import handler from '../api/analytics-config.js';

const keys = ['VERCEL_ENV', 'POSTHOG_PROJECT_TOKEN', 'POSTHOG_REGION'];
const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
afterEach(() => keys.forEach(key => {
  if (original[key] === undefined) delete process.env[key];
  else process.env[key] = original[key];
}));
function request(method = 'GET') {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  handler({ method }, res);
  return res;
}
test('analytics never exposes private keys or enables capture outside production', () => {
  for (const token of ['', 'phx_private_test', 'phc_valid_test']) {
    for (const environment of ['development', 'preview', 'production']) {
      process.env.VERCEL_ENV = environment;
      process.env.POSTHOG_PROJECT_TOKEN = token;
      process.env.POSTHOG_REGION = 'US';
      const res = request();
      assert.equal(res.headers['Cache-Control'], 'no-store');
      if (environment !== 'production' || !token.startsWith('phc_')) {
        assert.deepEqual(res.body, { enabled: false });
      } else assert.equal(res.body.token, token);
    }
  }
});
test('supports both cloud regions and rejects invalid region configuration', () => {
  process.env.VERCEL_ENV = 'production';
  process.env.POSTHOG_PROJECT_TOKEN = 'phc_public_test';
  for (const region of ['US', 'EU', 'https://untrusted.invalid']) {
    process.env.POSTHOG_REGION = region;
    assert.equal(request().body.enabled, ['US', 'EU'].includes(region));
  }
  assert.equal(request('POST').code, 405);
});
