import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createManagement, ManagementError } from '../lib/management.js';
import { managementHandler } from '../lib/management-handler.js';

const owner = { userId: 'user_owner', role: 'member' }, staff = { userId: 'user_staff', role: 'member' }, platform = { userId: 'user_platform', role: 'admin' };
const env = { CLERK_SECRET_KEY: 'sk_live_unit_test_only' };
function provider() {
  const calls = [];
  const org = { id: 'org_one', name: 'Negocio de prueba', created_by: 'user_owner', members_count: 3, private_metadata: { secret: 'NEVER EXPOSE' } };
  const members = ['owner', 'staff', 'other'].map(name => ({ id: `orgmem_${name}`, role: name === 'owner' ? 'org:admin' : 'org:member', public_user_data: { user_id: `user_${name}`, first_name: name, identifier: `${name}@example.com` }, private_metadata: { secret: 'NEVER EXPOSE' } }));
  const request = async (input, options = {}) => {
    const url = new URL(input); const path = url.pathname.replace('/v1', ''); const method = options.method || 'GET'; calls.push({ url, path, method, body: options.body && JSON.parse(options.body) });
    assert.equal(options.headers.Authorization, `Bearer ${env.CLERK_SECRET_KEY}`);
    if (method !== 'GET') return Response.json({ ...org, id: path.endsWith('organizations') ? 'org_new' : 'mutation' });
    if (path.endsWith('/organization_memberships')) return Response.json({ data: [{ organization: org, role: path.includes('user_owner') ? 'org:admin' : 'org:member' }] });
    if (path.endsWith('/memberships')) {
      const userId = url.searchParams.get('user_id[]');
      const result = path.includes('org_two') ? [] : userId ? members.filter(m => m.public_user_data.user_id === userId) : members;
      return Response.json({ data: result, total_count: result.length });
    }
    if (path.endsWith('/invitations')) return Response.json({ data: [{ id: 'orginv_pending', email_address: 'pending@example.com', role: 'org:member', status: 'pending' }] });
    if (path === '/organizations/org_one') return Response.json(org);
    if (path === '/organizations') return Response.json({ data: [org], total_count: 1 });
    if (path === '/users/count') return Response.json({ total_count: 3 });
    if (path === '/users') return Response.json([{ id: 'user_owner', email_addresses: [{ id: 'email_owner', email_address: 'owner@example.com', verification: { status: 'verified' } }], primary_email_address_id: 'email_owner', private_metadata: { secret: 'NEVER EXPOSE' } }]);
    throw Error(`Unexpected provider path: ${path}`);
  };
  return { calls, request };
}
test('platform admin can read real counts while ordinary users cannot call the admin provider', async () => {
  const mock = provider(), management = createManagement({ env, request: mock.request });
  await assert.rejects(management.adminData(owner), e => e.status === 403);
  assert.equal(mock.calls.length, 0);
  const result = await management.adminData(platform);
  assert.equal(result.businessCount, 1);
  assert.equal((await management.adminData(platform, { view: 'users' })).userCount, 3);
  assert.ok(!JSON.stringify(result).includes('NEVER EXPOSE'));
});
test('team reads use current provider membership and expose only permitted fields', async () => {
  const mock = provider(), management = createManagement({ env, request: mock.request });
  const result = await management.team(staff, 'org_one');
  assert.equal(result.canManage, false); assert.deepEqual(result.invitations, []);
  assert.ok(!JSON.stringify(result).includes('NEVER EXPOSE'));
  assert.equal(mock.calls.some(c => c.path.endsWith('/invitations')), false);
  await assert.rejects(management.team(owner, 'org_two'), e => e.status === 403);
  assert.equal(mock.calls.some(c => c.path === '/organizations/org_two'), false);
});

test('business data access rechecks provider roles and rejects staff writes and cross-business access', async () => {
  const mock=provider(),management=createManagement({env,request:mock.request});
  assert.equal((await management.businessAccess(owner,'org_one',true)).canManage,true);
  await assert.rejects(management.businessAccess(staff,'org_one',true),e=>e.code==='FORBIDDEN');
  await assert.rejects(management.businessAccess(owner,'org_two'),e=>e.code==='FORBIDDEN');
  assert.equal(mock.calls.some(c=>c.path==='/organizations/org_two'),false);
});
test('admin lists only fetch the selected resource and a known business team loads in parallel', async () => {
  const mock = provider(), management = createManagement({ env, request: mock.request });
  await management.adminData(platform, { view: 'businesses' });
  assert.deepEqual(mock.calls.map(c => c.path), ['/organizations']);
  mock.calls.length = 0;
  await management.adminData(platform, { view: 'users' });
  assert.deepEqual(mock.calls.map(c => c.path).sort(), ['/users', '/users/count']);
  mock.calls.length = 0;
  await management.team(platform, 'org_one');
  assert.equal(mock.calls.length, 3);
  assert.equal(mock.calls.some(c => c.path.includes('/users/')), false);
  assert.equal(mock.calls.some(c => c.path.includes('organization_memberships')), false);
  await assert.rejects(management.adminData(platform, { view: 'unknown' }), e => e.code === 'INVALID_REQUEST');
});
test('staff cannot invite, change roles, remove members or revoke invitations', async () => {
  const mock = provider(), management = createManagement({ env, request: mock.request });
  for (const action of ['invite', 'role', 'remove', 'revoke']) {
    await assert.rejects(management.mutateTeam(staff, { action, organizationId: 'org_one', userId: 'user_other', role: 'org:admin', email: 'person@example.com', invitationId: 'orginv_pending' }), e => e.status === 403);
  }
  assert.equal(mock.calls.filter(c => c.method !== 'GET').length, 0);
});
test('owners can invite with business roles, while owner/self and platform roles stay protected', async () => {
  const mock = provider(), management = createManagement({ env, request: mock.request });
  for (const userId of ['user_owner']) await assert.rejects(management.mutateTeam(owner, { action: 'remove', organizationId: 'org_one', userId }), e => e.code === 'PROTECTED_MEMBER');
  await assert.rejects(management.mutateTeam(platform, { action: 'role', organizationId: 'org_one', userId: 'user_owner', role: 'org:member' }), e => e.code === 'PROTECTED_MEMBER');
  await assert.rejects(management.mutateTeam(owner, { action: 'invite', organizationId: 'org_one', role: 'admin', email: 'person@example.com' }), e => e.code === 'INVALID_REQUEST');
  await management.mutateTeam(owner, { action: 'invite', organizationId: 'org_one', role: 'org:member', email: 'person@example.com' });
  const invite = mock.calls.find(c => c.method === 'POST');
  assert.equal(invite.body.role, 'org:member'); assert.equal(invite.body.expires_in_days, 7); assert.equal(invite.body.inviter_user_id, owner.userId);
  await management.mutateTeam(owner, { action: 'role', organizationId: 'org_one', userId: 'user_other', role: 'org:admin' });
  assert.equal(mock.calls.at(-1).method, 'PATCH');
});
test('business creation requires platform admin and a verified matching owner email', async () => {
  const mock = provider(), management = createManagement({ env, request: mock.request });
  await assert.rejects(management.createBusiness(owner, {}), e => e.status === 403);
  await assert.rejects(management.createBusiness(platform, { name: 'Negocio', ownerEmail: 'other@example.com' }), e => e.code === 'OWNER_MUST_SIGN_IN');
  await management.createBusiness(platform, { name: 'Negocio', ownerEmail: 'owner@example.com' });
  assert.equal(mock.calls.at(-1).body.created_by, 'user_owner');
});
test('missing configuration and HTTP failures never expose the provider secret or diagnostics', async () => {
  await assert.rejects(createManagement({ env: {} }).adminData(platform), e => e.code === 'MANAGEMENT_NOT_CONFIGURED');
  const handler = managementHandler(async () => { throw new ManagementError('FORBIDDEN', 403); }, { verify: async req => {
    if (!req.headers.authorization) throw Error(); return staff;
  } });
  const call = async req => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; await handler(req, res); return res; };
  assert.equal((await call({ method: 'GET', headers: {} })).code, 401);
  assert.equal((await call({ method: 'DELETE', headers: {} })).code, 405);
  assert.equal((await call({ method: 'POST', headers: { origin: 'https://other.invalid' } })).code, 403);
  const res = await call({ method: 'GET', headers: { authorization: 'token' }, query: {} });
  assert.equal(res.code, 403); assert.equal(res.headers['Cache-Control'], 'no-store'); assert.deepEqual(res.body, { error: 'FORBIDDEN' });
});
