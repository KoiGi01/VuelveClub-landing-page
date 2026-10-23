import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { createLogoService, verifyLogo, ownerPrefix } from '../lib/business-logo.js';
import { createHandler } from '../api/wallet-logo.js';

const env = { BLOB_STORE_ID: 'store_test', GOOGLE_WALLET_SERVICE_ACCOUNT_JSON: JSON.stringify({ private_key: 'unit-test-signing-material' }) };
async function fixture() {
  return sharp({ create: { width: 80, height: 40, channels: 4, background: '#E8502E' } }).png().toBuffer();
}
test('normalizes an image to a padded PNG, stores it under the verified owner and signs its URL', async () => {
  let stored;
  const service = createLogoService({ env, store: async (path, bytes, options) => {
    stored = { path, bytes, options }; return { url: `https://example.public.blob.vercel-storage.com/${path}` };
  } });
  const logo = await service.upload('user_owner', (await fixture()).toString('base64'));
  assert.match(stored.path, new RegExp(`^business-logos/${ownerPrefix('user_owner')}/[a-f0-9]{64}\\.png$`));
  const metadata = await sharp(stored.bytes).metadata();
  assert.equal(metadata.width, 1000); assert.equal(metadata.height, 1000); assert.equal(metadata.format, 'png');
  const { data } = await sharp(stored.bytes).raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([...data.subarray(0, 3)], [249, 247, 239]);
  assert.equal(stored.options.access, 'public');
  assert.equal(stored.options.contentType, 'image/png');
  assert.equal(await verifyLogo(logo.logoToken, 'user_owner', env), logo.logoUrl);
  await assert.rejects(verifyLogo(logo.logoToken, 'user_other', env));
  await assert.rejects(verifyLogo(logo.logoToken + 'tampered', 'user_owner', env));
  assert.ok(!JSON.stringify(logo).includes('unit-test-signing-material'));
});
test('invalid, oversized and vector files are rejected without storing anything', async () => {
  let uploads = 0;
  const service = createLogoService({ env, store: async () => { uploads++; } });
  for (const image of ['', 'not valid base64!', Buffer.from('not an image').toString('base64'),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>').toString('base64'),
    'A'.repeat(2800000)]) {
    await assert.rejects(service.upload('user_owner', image));
  }
  assert.equal(uploads, 0);
});
test('storage failure never returns a usable signed logo or reveals provider diagnostics', async () => {
  const service = createLogoService({ env, store: async () => { throw Error('PRIVATE STORAGE TOKEN'); } });
  await assert.rejects(service.upload('user_owner', (await fixture()).toString('base64')),
    error => error.code === 'LOGO_UPLOAD_FAILED' && !error.message.includes('PRIVATE'));
});
test('upload endpoint rejects unauthenticated requests and uses the verified owner instead of body identity', async () => {
  let uploaded;
  const handler = createHandler({ verify: async req => {
    if (!req.headers.authorization) throw Error(); return { userId: 'user_verified' };
  }, logos: { upload: async (userId, image) => { uploaded = { userId, image }; return { logoUrl: 'test' }; } } });
  const call = async req => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handler(req, res); return res;
  };
  assert.equal((await call({ method: 'GET', headers: {} })).code, 405);
  assert.equal((await call({ method: 'POST', headers: {}, body: {} })).code, 401);
  assert.equal((await call({ method: 'POST', headers: { origin: 'https://other.invalid' } })).code, 403);
  assert.equal((await call({ method: 'POST', headers: { authorization: 'token' }, body: 'not-json' })).code, 400);
  const res = await call({ method: 'POST', headers: { authorization: 'token' }, body: { image: 'bytes', userId: 'user_other' } });
  assert.deepEqual(uploaded, { userId: 'user_verified', image: 'bytes' });
  assert.equal(res.headers['Cache-Control'], 'no-store'); assert.equal(res.code, 200);
});
