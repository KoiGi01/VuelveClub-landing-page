import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ReadCache } from '../dashboard/read-cache.js';

test('read snapshots expire and concurrent requests share a single loader', async () => {
  let now = 0, calls = 0;
  const cache = new ReadCache({ now: () => now });
  const loader = async () => { calls++; return { version: calls }; };
  const [first, second] = await Promise.all([cache.get('user_one:list', loader), cache.get('user_one:list', loader)]);
  assert.equal(calls, 1); assert.equal(first, second);
  assert.equal(await cache.get('user_one:list', loader), first);
  assert.equal(cache.peek('user_two:list'), undefined);
  now = 15001;
  assert.equal(cache.peek('user_one:list'), undefined);
  assert.equal((await cache.get('user_one:list', loader)).version, 2);
});
test('invalidating pending reads prevents late results from restoring old snapshots', async () => {
  const cache = new ReadCache(); let release;
  const pending = cache.get('list', () => new Promise(resolve => { release = resolve; }));
  await Promise.resolve(); cache.clear(); release({ old: true }); await pending;
  assert.equal(cache.peek('list'), undefined);
  assert.deepEqual(await cache.get('list', async () => ({ fresh: true })), { fresh: true });
});
test('read errors are retried, and memory use is bounded', async () => {
  const cache = new ReadCache({ limit: 2 });
  await assert.rejects(cache.get('list', async () => { throw Error('offline'); }));
  assert.equal(await cache.get('list', async () => 'recovered'), 'recovered');
  await cache.get('another', async () => 2); await cache.get('third', async () => 3);
  assert.equal(cache.peek('list'), undefined); assert.equal(cache.entries.size, 2);
});
