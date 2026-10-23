import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDatabase } from '../lib/database.js';

const env = { SUPABASE_URL: 'https://testproject.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test_only' };
test('database reads always include a bounded business filter and never send secrets as bearer tokens', async () => {
  const calls = [];
  const database = createDatabase({ env, request: async (input, options) => {
    calls.push({ url: new URL(input), options });
    return Response.json([{ id: 'record' }], { headers: { 'content-range': '0-0/1' } });
  } });
  const result = await database.read('org_one', 'customers');
  assert.deepEqual(result, { records: [{ id: 'record' }], total: 1, offset: 0, limit: 20 });
  assert.equal(calls[0].url.searchParams.get('business_id'), 'eq.org_one');
  assert.equal(calls[0].url.searchParams.get('limit'), '20');
  assert.equal(calls[0].options.headers.apikey, env.SUPABASE_SECRET_KEY);
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.equal(calls[0].options.redirect, 'error');
  await database.read('org_two', 'businesses');
  assert.equal(calls[1].url.searchParams.get('clerk_organization_id'), 'eq.org_two');
});

test('database rejects missing configuration, unsafe hosts and unscoped requests before calling the provider', async () => {
  let calls = 0;
  const request = async () => { calls++; throw Error('Should not fetch'); };
  for (const url of ['https://supabase.com/dashboard/project/test', 'http://testproject.supabase.co', 'https://testproject.supabase.co/path', 'https://testproject.supabase.co/?apikey=secret', 'https://user:password@testproject.supabase.co']) {
    await assert.rejects(createDatabase({ env: { ...env, SUPABASE_URL: url }, request }).read('org_one', 'customers'), e => e.code === 'DATABASE_NOT_CONFIGURED');
  }
  const database = createDatabase({ env, request });
  for (const args of [[undefined, 'customers'], ['org_one&business_id=eq.org_two', 'customers'], ['org_one', '../auth/users'], ['org_one', 'customers', { limit: 1000 }], ['org_one', 'customers', { offset: -1 }]]) {
    await assert.rejects(database.read(...args), e => e.code === 'INVALID_REQUEST');
  }
  await assert.rejects(createDatabase({ env: {}, request }).read('org_one', 'customers'), e => e.code === 'DATABASE_NOT_CONFIGURED');
  assert.equal(calls, 0);
});

test('database failures are sanitized and missing schema is distinguished from an empty list', async () => {
  const missing = createDatabase({ env, request: async () => Response.json({ code: 'PGRST205', message: 'private provider details' }, { status: 404 }) });
  await assert.rejects(missing.read('org_one', 'customers'), e => e.code === 'DATABASE_SCHEMA_REQUIRED' && !e.message.includes('private'));
  const denied = createDatabase({ env, request: async () => Response.json({ message: env.SUPABASE_SECRET_KEY }, { status: 401 }) });
  await assert.rejects(denied.read('org_one', 'customers'), e => e.code === 'DATABASE_UNAVAILABLE' && !e.message.includes(env.SUPABASE_SECRET_KEY));
  const offline = createDatabase({ env, request: async () => { throw Error(env.SUPABASE_SECRET_KEY); } });
  await assert.rejects(offline.read('org_one', 'customers'), e => e.code === 'DATABASE_UNAVAILABLE');
  const empty = createDatabase({ env, request: async () => Response.json([], { headers: { 'content-range': '*/0' } }) });
  assert.deepEqual((await empty.read('org_one', 'customers')).records, []);
});
