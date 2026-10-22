import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose';
import { verifySession } from '../lib/session.js';
import { createHandler } from '../api/session.js';

let privateKey, keySet;
const issuer = 'https://clerk.vuelveclub.com';
const origin = 'https://app.vuelveclub.com';
before(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  keySet = createLocalJWKSet({ keys: [{ ...await exportJWK(pair.publicKey), kid: 'test', alg: 'RS256' }] });
});
async function token(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub: 'user_owner', sid: 'sess_example', iss: issuer, azp: origin,
    iat: now, nbf: now - 1, exp: now + 60, ...overrides })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' }).sign(privateKey);
}
const options = () => ({ keySet, adminUserIds: ['user_owner'] });
const request = (jwt, extra = {}) => ({ method: 'GET', headers: { authorization: `Bearer ${jwt}` }, ...extra });

test('only the configured, cryptographically verified user ID gets admin access', async () => {
  assert.deepEqual(await verifySession(request(await token()), options()), {
    userId: 'user_owner', role: 'admin', canPreview: true
  });
  const member = await verifySession(request(await token({ sub: 'user_other', role: 'admin',
    email: 'luismedlozn@gmail.com', metadata: { role: 'admin' } })), options());
  assert.deepEqual(member, { userId: 'user_other', role: 'member', canPreview: false });
});
test('rejects expired, premature, wrong-issuer, wrong-origin, pending and non-session tokens', async () => {
  const now = Math.floor(Date.now() / 1000);
  for (const claims of [{ exp: now - 60 }, { nbf: now + 60 }, { iss: 'https://other.invalid' },
    { azp: 'https://untrusted.vuelveclub.com' }, { sts: 'pending' }, { sid: undefined }, { sub: 'other' }]) {
    await assert.rejects(verifySession(request(await token(claims)), options()));
  }
});
test('rejects tampered, unsigned and absent tokens', async () => {
  const valid = await token();
  const pieces = valid.split('.');
  pieces[1] = Buffer.from(JSON.stringify({ sub: 'user_owner', role: 'admin' })).toString('base64url');
  for (const invalid of ['', 'not-a-token', pieces.join('.'),
    Buffer.from('{"alg":"none"}').toString('base64url') + '.' + pieces[1] + '.']) {
    await assert.rejects(verifySession(request(invalid), options()));
  }
  await assert.rejects(verifySession({ headers: {} }, options()));
});
test('HTTP endpoint fails closed and never accepts browser-supplied roles', async () => {
  const handler = createHandler(req => verifySession(req, options()));
  const call = async req => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; },
      status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handler(req, res); return res;
  };
  assert.equal((await call({ method: 'POST', headers: {}, body: { role: 'admin' } })).code, 405);
  const unauthenticated = await call({ method: 'GET', headers: {} });
  assert.equal(unauthenticated.code, 401);
  assert.deepEqual(unauthenticated.body, { error: 'Unauthorized' });
  const member = await call(request(await token({ sub: 'user_other' }), { body: { role: 'admin' } }));
  assert.equal(member.code, 200);
  assert.equal(member.body.role, 'member');
  assert.equal(member.headers['Cache-Control'], 'no-store');
});
