import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db, draft;
const design = { business: 'Cafe real', reward: 'Un cafe', goal: 10, color: '#CBDE2A', termsUrl: 'https://example.com/terms', privacyUrl: 'https://example.com/privacy', termsVersion: 'v1' };
before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const dir = new URL('../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(dir)).sort()) await db.exec(await readFile(new URL(name, dir), 'utf8'));
  await db.exec("insert into public.businesses(clerk_organization_id,name) values ('org_one','One'),('org_two','Two')");
});
after(async () => { await db?.close(); });
async function save(revision, data = design) {
  return (await db.query('select public.vc_save_design($1,$2,$3,$4) as d', ['org_one', 'user_owner', JSON.stringify(data), revision])).rows[0].d;
}
async function publish(d) { return (await db.query('select public.vc_publish_design($1,$2,$3) as d', ['org_one', d.id, d.revision])).rows[0].d; }
test('drafts persist with conflict detection and require documents before atomic publication', async () => {
  draft = await save(null, { ...design, termsUrl: null, privacyUrl: null, termsVersion: null });
  await assert.rejects(publish(draft), /VC_DOCUMENTS_REQUIRED/);
  await assert.rejects(save(999), /VC_CONFLICT/);
  draft = await save(draft.revision);
  const active = await publish(draft);
  assert.equal(active.status, 'active'); assert.ok(active.published_at);
  assert.equal((await publish(draft)).id, active.id);
  await assert.rejects(db.query('select public.vc_publish_design($1,$2,$3)', ['org_two',draft.id,draft.revision]), /VC_NOT_FOUND/);
});
test('registration is atomic, retry-safe, versioned and never exposes an existing customer to a new token', async () => {
  const slug = (await db.query("select enrollment_slug from public.businesses where clerk_organization_id='org_one'")).rows[0].enrollment_slug;
  const args = [slug,'a'.repeat(64),'b'.repeat(64),draft.id,'Alex','alex@example.com','+529991234567','v1'];
  const register = args => db.query('select public.vc_enroll($1,$2,$3,$4,$5,$6,$7,$8) as member', args);
  const first = (await register(args)).rows[0].member;
  const retry = (await register(args)).rows[0].member;
  assert.equal(first.cardId,retry.cardId); assert.equal(first.design.id,draft.id);
  await assert.rejects(register([slug,'c'.repeat(64),...args.slice(2)]), /VC_ALREADY_REGISTERED/);
  await assert.rejects(register([slug,args[1],'d'.repeat(64),...args.slice(3)]), /VC_CONFLICT/);
  assert.equal((await db.query('select count(*)::int as n from public.customers')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int as n from public.loyalty_cards')).rows[0].n,1);
  const customer = (await db.query('select * from public.customers')).rows[0];
  assert.equal(customer.terms_version,'v1');assert.ok(customer.terms_accepted_at);assert.equal(customer.marketing_consent,false);
  await assert.rejects(db.query("insert into public.loyalty_cards(business_id,customer_id,design_id) values('org_two',$1,$2)",[customer.id,draft.id]), e => e.code==='23503');
  const next = await save(null,{...design,reward:'Otro premio',termsVersion:'v2'});await publish(next);
  assert.equal((await register(args)).rows[0].member.design.id,draft.id);
  await assert.rejects(register([slug,'e'.repeat(64),'f'.repeat(64),draft.id,'New','new@example.com','+529991234568','v1']), /VC_PROGRAM_CHANGED/);
  assert.equal((await db.query("select count(*)::int as n from public.card_designs where status='active'")).rows[0].n,1);
});
test('rate limits are shared in PostgreSQL and browser roles cannot invoke privileged RPCs', async () => {
  for(let i=1;i<=32;i++)assert.equal((await db.query('select public.vc_enrollment_rate($1) as allowed',['a'.repeat(64)])).rows[0].allowed,i<=30);
  for(const role of ['anon','authenticated']){
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query('select * from public.customers'),e=>e.code==='42501');
    await assert.rejects(db.query('select public.vc_enrollment_rate($1)',['a'.repeat(64)]),e=>e.code==='42501');
    await db.exec('reset role');
  }
});
test('support quotas are shared, separated by scope and inaccessible to browser roles',async()=>{
  const bucket='b'.repeat(64);
  for(let i=1;i<=22;i++)assert.equal((await db.query("select public.vc_support_limit($1,'chat_ip') as allowed",[bucket])).rows[0].allowed,i<=20);
  assert.equal((await db.query("select public.vc_support_limit($1,'chat_global') as allowed",[bucket])).rows[0].allowed,true);
  for(let i=1;i<=7;i++)assert.equal((await db.query("select public.vc_support_limit($1,'mail_ip') as allowed",[bucket])).rows[0].allowed,i<=5);
  await db.query("update public.support_request_limits set window_start=now()-interval '2 hours' where scope='mail_ip'");
  assert.equal((await db.query("select public.vc_support_limit($1,'mail_ip') as allowed",[bucket])).rows[0].allowed,true);
  await db.exec('set role anon');await assert.rejects(db.query("select public.vc_support_limit($1,'chat_ip')",[bucket]),e=>e.code==='42501');await db.exec('reset role');
});
