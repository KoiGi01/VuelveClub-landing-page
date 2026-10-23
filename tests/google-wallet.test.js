import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { generateKeyPair, exportPKCS8, jwtVerify } from 'jose';
import { createWalletService, validateDesign, stampImage, WalletError } from '../lib/google-wallet.js';
import { createHandler } from '../api/wallet-test.js';
import { createLogoService } from '../lib/business-logo.js';
import sharp from 'sharp';

let env, publicKey;
const design = { business: 'Cafe de prueba', reward: 'Un cafe', goal: 10, color: '#CBDE2A' };
before(async () => {
  const pair = await generateKeyPair('RS256', { extractable: true });
  publicKey = pair.publicKey;
  env = { GOOGLE_WALLET_ISSUER_ID: '123456789', GOOGLE_WALLET_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: 'service_account', client_email: 'test@project.iam.gserviceaccount.com',
    private_key: await exportPKCS8(pair.privateKey), private_key_id: 'test-key'
  }) };
});
function googleMock({ existing = false, failure } = {}) {
  const resources = [], calls = [];
  const request = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes('oauth2')) return Response.json({ access_token: 'private-test-token', expires_in: 3600 });
    if (failure) return Response.json({ error: { message: 'NEVER RETURN THIS SENSITIVE DIAGNOSTIC' } }, { status: failure });
    if (options.method === 'POST') { resources.push(JSON.parse(options.body)); return Response.json({}, { status: 200 }); }
    return Response.json({}, { status: existing ? 200 : 404 });
  };
  return { request, resources, calls };
}
test('creates test-only loyalty resources and signs a compact Save to Wallet link', async () => {
  const mock = googleMock();
  const wallet = createWalletService({ env, request: mock.request });
  const result = await wallet.issueTest('user_one', design);
  assert.equal(result.testOnly, true);
  const signed = result.saveUrl.split('/save/')[1];
  assert.ok(signed.length < 1800);
  const { payload } = await jwtVerify(signed, publicKey, { issuer: 'test@project.iam.gserviceaccount.com', audience: 'google' });
  assert.equal(payload.typ, 'savetowallet');
  assert.deepEqual(payload.origins, ['https://app.vuelveclub.com']);
  assert.deepEqual(payload.payload.loyaltyObjects, [{ id: result.objectId }]);
  assert.equal(payload.exp - payload.iat, 86400);
  assert.equal(mock.resources.length, 2);
  assert.equal(mock.resources[0].reviewStatus, 'UNDER_REVIEW');
  assert.equal(mock.resources[0].hexBackgroundColor, design.color);
  assert.equal(mock.resources[0].heroImage.sourceUri.uri, 'https://www.vuelveclub.com/assets/wallet/stamps-10-dark.png');
  assert.match(mock.resources[0].programName, /Prueba/);
  assert.equal(mock.resources[1].accountName, 'Alex Demo');
  assert.deepEqual(mock.resources[1].loyaltyPoints.balance, { string: '0 / 10' });
  assert.match(mock.resources[1].barcode.value, /^VC-TEST-/);
  assert.ok(!JSON.stringify(result).includes('private-test-token'));
});
test('stamp art matches the visit goal and remains visible on light and dark cards', () => {
  for (const goal of [5, 8, 10, 12]) {
    assert.match(stampImage(goal, '#3E2B49'), new RegExp(`stamps-${goal}-light\\.png$`));
    assert.match(stampImage(goal, '#CBDE2A'), new RegExp(`stamps-${goal}-dark\\.png$`));
    assert.match(stampImage(goal, '#F1ECDF'), new RegExp(`stamps-${goal}-dark\\.png$`));
  }
});
test('resource IDs are stable for retries and isolated across users and designs', async () => {
  const mock = googleMock({ existing: true });
  const wallet = createWalletService({ env, request: mock.request });
  const first = await wallet.issueTest('user_one', design);
  assert.equal((await wallet.issueTest('user_one', design)).objectId, first.objectId);
  assert.notEqual((await wallet.issueTest('user_two', design)).objectId, first.objectId);
  assert.notEqual((await wallet.issueTest('user_one', { ...design, color: '#3E2B49' })).objectId, first.objectId);
  assert.equal(mock.resources.length, 0);
  assert.equal(mock.calls.filter(c => c.url.includes('oauth2')).length, 1);
});
test('uses a signed business logo in Google Wallet and rejects another account using that logo', async () => {
  const logoEnv = { ...env, BLOB_STORE_ID: 'store_test' };
  const image = await sharp({ create: { width: 32, height: 32, channels: 4, background: '#CBDE2A' } }).png().toBuffer();
  const logo = await createLogoService({ env: logoEnv, store: async path => ({ url: `https://example.public.blob.vercel-storage.com/${path}` }) })
    .upload('user_one', image.toString('base64'));
  const mock = googleMock(); const wallet = createWalletService({ env: logoEnv, request: mock.request });
  await wallet.issueTest('user_one', { ...design, logoToken: logo.logoToken, logoUrl: 'https://untrusted.invalid' });
  assert.equal(mock.resources[0].programLogo.sourceUri.uri, logo.logoUrl);
  assert.equal(mock.resources[0].issuerName, design.business);
  assert.match(mock.resources[0].textModulesData.at(-1).body, /Powered by vuelveclub/);
  const calls = mock.calls.length;
  await assert.rejects(wallet.issueTest('user_other', { ...design, logoToken: logo.logoToken }), error => error.code === 'INVALID_LOGO');
  assert.equal(mock.calls.length, calls);
});
test('invalid design and missing credentials fail before contacting Google', async () => {
  for (const input of [null, {}, { ...design, goal: 999 }, { ...design, business: '<script>' },
    { ...design, color: 'red' }, { ...design, reward: 'a'.repeat(61) }, { ...design, reward: '' }]) {
    assert.throws(() => validateDesign(input), error => error.code === 'INVALID_DESIGN');
  }
  let contacted = false;
  await assert.rejects(createWalletService({ env: {}, request: async () => { contacted = true; } }).issueTest('user_one', design),
    error => error.code === 'NOT_CONFIGURED');
  assert.equal(contacted, false);
});
test('Google errors do not leak diagnostics or produce a successful save link', async () => {
  const mock = googleMock({ failure: 403 });
  await assert.rejects(createWalletService({ env, request: mock.request }).issueTest('user_one', design),
    error => error instanceof WalletError && error.code === 'GOOGLE_ACCESS_DENIED');
});
test('HTTP endpoint requires a verified session, rejects wrong origins, and ignores browser owner IDs', async () => {
  let issued;
  const handler = createHandler({ verify: async req => {
    if (req.headers.authorization !== 'Bearer valid-test-session') throw Error();
    return { userId: 'user_verified', role: 'member' };
  }, wallet: { issueTest: async (id, input) => { issued = { id, input }; return { testOnly: true }; } } });
  const call = async req => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handler(req, res); return res;
  };
  assert.equal((await call({ method: 'GET', headers: {} })).code, 405);
  assert.equal((await call({ method: 'POST', headers: {}, body: design })).code, 401);
  assert.equal((await call({ method: 'POST', headers: { origin: 'https://other.invalid' }, body: design })).code, 403);
  const headers = { authorization: 'Bearer valid-test-session', origin: 'https://app.vuelveclub.com' };
  assert.equal((await call({ method: 'POST', headers, body: '{bad' })).code, 400);
  const response = await call({ method: 'POST', headers, body: { ...design, userId: 'user_admin', classId: 'other', accountName: 'PII' } });
  assert.equal(response.code, 200);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.deepEqual(issued, { id: 'user_verified', input: design });
});
