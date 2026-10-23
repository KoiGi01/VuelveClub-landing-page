import { createHash } from 'node:crypto';

export class ManagementError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
const roles = ['org:admin', 'org:member'];
const id = (value, prefix) => {
  if (typeof value !== 'string' || !new RegExp(`^${prefix}_[A-Za-z0-9]+$`).test(value)) throw new ManagementError('INVALID_REQUEST');
  return value;
};
const person = user => ({
  id: user.id, name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Sin nombre',
  email: user.email_addresses?.find(e => e.id === user.primary_email_address_id)?.email_address || '',
  createdAt: user.created_at, lastActiveAt: user.last_active_at
});
const organization = org => ({ id: org.id, name: org.name, members: org.members_count ?? org.membersCount ?? null, createdAt: org.created_at });
const items = response => Array.isArray(response) ? response : response.data || [];
const memberId = membership => membership.public_user_data?.user_id || membership.user_id;

export function createManagement({ env = process.env, request = fetch } = {}) {
  async function clerk(path, { method = 'GET', body } = {}) {
    if (!/^sk_live_/.test(env.CLERK_SECRET_KEY || '')) throw new ManagementError('MANAGEMENT_NOT_CONFIGURED', 503);
    const response = await request(`https://api.clerk.com/v1${path}`, { method,
      headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      let code; try { code = (await response.json()).errors?.[0]?.code; } catch { /* Never expose provider diagnostics. */ }
      if (response.status === 429) throw new ManagementError('TRY_AGAIN_LATER', 429);
      if (response.status === 404) throw new ManagementError('NOT_FOUND', 404);
      if (['duplicate_record', 'organization_invitation_exists', 'form_identifier_exists', 'organization_membership_exists'].includes(code)) throw new ManagementError('ALREADY_ADDED', 409);
      if (response.status === 422 || response.status === 400) throw new ManagementError('PROVIDER_REJECTED', 400);
      throw new ManagementError('MANAGEMENT_UNAVAILABLE', 503);
    }
    return response.status === 204 ? {} : response.json();
  }
  function admin(session) { if (session.role !== 'admin') throw new ManagementError('FORBIDDEN', 403); }
  async function memberships(session) {
    const list = await clerk(`/users/${id(session.userId, 'user')}/organization_memberships?limit=100`);
    return items(list).map(m => ({ ...organization(m.organization), role: m.role }));
  }
  async function access(session, orgId, write = false) {
    id(orgId, 'org');
    let role = 'platform:admin';
    if (session.role !== 'admin') {
      const own = await clerk(`/organizations/${orgId}/memberships?user_id%5B%5D=${id(session.userId, 'user')}&limit=100`);
      const membership = items(own).find(m => memberId(m) === session.userId);
      if (!membership || (write && membership.role !== 'org:admin')) throw new ManagementError('FORBIDDEN', 403);
      role = membership.role;
    }
    const org = await clerk(`/organizations/${orgId}`);
    return { org, role, canManage: role === 'org:admin' || role === 'platform:admin' };
  }
  return {
    async adminOverview(session, { query = '', offset = 0 } = {}) {
      admin(session);
      const params = new URLSearchParams({ limit: '20', offset: String(offset), include_members_count: 'true', ...(query ? { query } : {}) });
      const [businesses, users, count] = await Promise.all([
        clerk(`/organizations?${params}`), clerk(`/users?limit=20&offset=${offset}${query ? `&query=${encodeURIComponent(query)}` : ''}`), clerk(`/users/count${query ? `?query=${encodeURIComponent(query)}` : ''}`)
      ]);
      return { businesses: items(businesses).map(organization), businessCount: businesses.total_count ?? items(businesses).length,
        users: items(users).map(person), userCount: count.total_count, offset, limit: 20 };
    },
    async createBusiness(session, input) {
      admin(session);
      const name = typeof input.name === 'string' ? input.name.trim() : '';
      const email = typeof input.ownerEmail === 'string' ? input.ownerEmail.trim().toLowerCase() : '';
      if (!name || name.length > 60 || /[<>\x00-\x1f]/.test(name) || email.length > 120 || !/^\S+@\S+\.\S+$/.test(email)) throw new ManagementError('INVALID_REQUEST');
      const users = await clerk(`/users?email_address%5B%5D=${encodeURIComponent(email)}&limit=10`);
      const owner = items(users).find(u => u.email_addresses?.some(e => e.email_address.toLowerCase() === email && e.verification?.status === 'verified'));
      if (!owner) throw new ManagementError('OWNER_MUST_SIGN_IN', 409);
      const slug = `vc-${createHash('sha256').update(`${owner.id}:${name.toLocaleLowerCase('es-MX')}`).digest('hex').slice(0, 32)}`;
      const org = await clerk('/organizations', { method: 'POST', body: { name, slug, created_by: owner.id,
        public_metadata: { vuelveclub: true }, private_metadata: { provisioned_by: session.userId } } });
      return { business: organization(org) };
    },
    async team(session, orgId, offset = 0) {
      const available = await memberships(session);
      if (!orgId) orgId = available[0]?.id;
      if (!orgId) return { businesses: available, business: null, members: [], invitations: [], canManage: false };
      const { org, role, canManage } = await access(session, orgId);
      const [members, invitations] = await Promise.all([
        clerk(`/organizations/${orgId}/memberships?limit=20&offset=${offset}`),
        canManage ? clerk(`/organizations/${orgId}/invitations?status%5B%5D=pending&limit=100`) : Promise.resolve({ data: [] })
      ]);
      return { businesses: available, business: organization(org), role, canManage, memberCount: members.total_count ?? items(members).length,
        offset, limit: 20, members: items(members).map(m => ({ id: m.id, userId: memberId(m),
          name: [m.public_user_data?.first_name, m.public_user_data?.last_name].filter(Boolean).join(' ') || 'Sin nombre',
          email: m.public_user_data?.identifier || '', role: m.role, isOwner: memberId(m) === org.created_by,
          isSelf: memberId(m) === session.userId })),
        invitations: items(invitations).map(i => ({ id: i.id, email: i.email_address, role: i.role, status: i.status, createdAt: i.created_at })) };
    },
    async mutateTeam(session, input) {
      const orgId = id(input.organizationId, 'org');
      const { org } = await access(session, orgId, true);
      if (input.action === 'invite') {
        const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
        if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 120 || !roles.includes(input.role)) throw new ManagementError('INVALID_REQUEST');
        await clerk(`/organizations/${orgId}/invitations`, { method: 'POST', body: { email_address: email, role: input.role,
          ...(session.role !== 'admin' ? { inviter_user_id: session.userId } : {}),
          redirect_url: 'https://app.vuelveclub.com/iniciar-sesion', expires_in_days: 7 } });
      } else if (input.action === 'revoke') {
        await clerk(`/organizations/${orgId}/invitations/${id(input.invitationId, 'orginv')}/revoke`, { method: 'POST' });
      } else if (['role', 'remove'].includes(input.action)) {
        const userId = id(input.userId, 'user');
        if (userId === org.created_by || userId === session.userId) throw new ManagementError('PROTECTED_MEMBER', 409);
        if (input.action === 'role' && !roles.includes(input.role)) throw new ManagementError('INVALID_REQUEST');
        await clerk(`/organizations/${orgId}/memberships/${userId}`, { method: input.action === 'role' ? 'PATCH' : 'DELETE',
          ...(input.action === 'role' ? { body: { role: input.role } } : {}) });
      } else throw new ManagementError('INVALID_REQUEST');
      return { ok: true };
    }
  };
}
