// Server-only Supabase Data API access. Callers must verify the Clerk session and
// current organization membership before passing an organization ID here.
export class DatabaseError extends Error {
  constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}

const resources = new Set(['businesses', 'customers', 'card_designs', 'loyalty_cards', 'visits', 'redemptions']);
export function createDatabase({ env = process.env, request = fetch } = {}) {
  function configuration() {
    let url;
    try { url = new URL(env.SUPABASE_URL); } catch { throw new DatabaseError('DATABASE_NOT_CONFIGURED'); }
    if (url.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname) ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
        !/^sb_secret_[A-Za-z0-9_-]+$/.test(env.SUPABASE_SECRET_KEY || '')) {
      throw new DatabaseError('DATABASE_NOT_CONFIGURED');
    }
    return { url, key: env.SUPABASE_SECRET_KEY };
  }
  async function call(path, { method = 'GET', params, body, prefer } = {}) {
    const { url, key } = configuration();
    const endpoint = new URL(`/rest/v1/${path}`, url);
    if (params) endpoint.search = new URLSearchParams(params);
    let response, result;
    try {
      response = await request(endpoint, { method, headers: { apikey: key, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(prefer ? { Prefer: prefer } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000), redirect: 'error' });
      result = await response.json();
    } catch { throw new DatabaseError('DATABASE_UNAVAILABLE'); }
    if (!response.ok) {
      const codes = { VC_NOT_FOUND: ['PROGRAM_NOT_FOUND', 404], VC_CONFLICT: ['DESIGN_CONFLICT', 409],
        VC_DOCUMENTS_REQUIRED: ['DOCUMENTS_REQUIRED', 400], VC_ALREADY_REGISTERED: ['REGISTRATION_EXISTS', 409],
        VC_PROGRAM_CHANGED: ['PROGRAM_CHANGED', 409], VC_INVALID: ['INVALID_REQUEST', 400] };
      const mapped = codes[result?.message];
      if (mapped) throw new DatabaseError(...mapped);
      throw new DatabaseError(['PGRST205', 'PGRST202', '42P01'].includes(result?.code) ? 'DATABASE_SCHEMA_REQUIRED' : 'DATABASE_UNAVAILABLE');
    }
    return { result, response };
  }
  return {
    async syncBusiness(business) {
      if (!/^org_[A-Za-z0-9]+$/.test(business?.id || '')) throw new DatabaseError('INVALID_REQUEST', 400);
      const { result } = await call('businesses', { method: 'POST', params: { on_conflict: 'clerk_organization_id' },
        body: { clerk_organization_id: business.id, name: business.name }, prefer: 'resolution=merge-duplicates,return=representation' });
      return result[0];
    },
    async rpc(name, body) {
      if (!['vc_save_design', 'vc_publish_design', 'vc_enroll', 'vc_enrollment_rate', 'vc_support_limit'].includes(name)) throw new DatabaseError('INVALID_REQUEST', 400);
      return (await call(`rpc/${name}`, { method: 'POST', body })).result;
    },
    async publicProgram(slug) {
      if (!/^[a-f0-9-]{36}$/.test(slug || '')) throw new DatabaseError('PROGRAM_NOT_FOUND', 404);
      const { result: businesses } = await call('businesses', { params: { enrollment_slug: `eq.${slug}`, select: 'clerk_organization_id', limit: '1' } });
      if (!businesses[0]) throw new DatabaseError('PROGRAM_NOT_FOUND', 404);
      const { result: designs } = await call('card_designs', { params: { business_id: `eq.${businesses[0].clerk_organization_id}`, status: 'eq.active', select: 'id,name,reward,visit_goal,background_color,logo_url,terms_url,privacy_url,terms_version', limit: '1' } });
      if (!designs[0]) throw new DatabaseError('PROGRAM_NOT_FOUND', 404);
      return designs[0];
    },
    async designs(organizationId) {
      if (!/^org_[A-Za-z0-9]+$/.test(organizationId || '')) throw new DatabaseError('INVALID_REQUEST', 400);
      return (await call('card_designs', { params: { business_id: `eq.${organizationId}`, status: 'in.(draft,active)', select: '*', order: 'created_at.desc', limit: '2' } })).result;
    },
    async member(organizationId, customerId) {
      if (!/^org_[A-Za-z0-9]+$/.test(organizationId || '') || !/^[a-f0-9-]{36}$/.test(customerId || '')) throw new DatabaseError('INVALID_REQUEST', 400);
      const { result: cards } = await call('loyalty_cards', { params: { business_id: `eq.${organizationId}`, customer_id: `eq.${customerId}`, status: 'eq.active', select: 'id,design_id', order: 'created_at.desc', limit: '1' } });
      if (!cards[0]) throw new DatabaseError('PROGRAM_NOT_FOUND', 404);
      const [{ result: people }, { result: designs }] = await Promise.all([
        call('customers', { params: { business_id: `eq.${organizationId}`, id: `eq.${customerId}`, select: 'name', limit: '1' } }),
        call('card_designs', { params: { business_id: `eq.${organizationId}`, id: `eq.${cards[0].design_id}`, select: '*', limit: '1' } })
      ]);
      if (!people[0] || !designs[0]) throw new DatabaseError('PROGRAM_NOT_FOUND', 404);
      return { businessId: organizationId, cardId: cards[0].id, name: people[0].name, design: designs[0] };
    },
    async customers(organizationId, { query = '', offset = 0 } = {}) {
      if (!/^org_[A-Za-z0-9]+$/.test(organizationId || '') || typeof query !== 'string' || query.length > 60 || !Number.isInteger(offset) || offset < 0 || offset > 10000) throw new DatabaseError('INVALID_REQUEST', 400);
      // Remove PostgREST grammar before constructing the optional OR expression.
      const term = query.trim().replace(/[^\p{L}\p{N}@.+ -]/gu, '').replace(/[.*]/g, '');
      const { result, response } = await call('customers', { params: { business_id: `eq.${organizationId}`,
        select: 'id,name,email,phone,created_at', order: 'created_at.desc,id.desc', limit: '20', offset: String(offset),
        ...(term ? { or: `(name.ilike.*${term}*,email.ilike.*${term}*,phone.ilike.*${term.replace(/\s/g, '')}*)` } : {}) }, prefer: 'count=exact' });
      return { customers: result, customerCount: Number(response.headers.get('content-range')?.split('/')[1]) || 0 };
    },
    async read(organizationId, resource, { offset = 0, limit = 20 } = {}) {
      if (!/^org_[A-Za-z0-9]+$/.test(organizationId || '') || !resources.has(resource) ||
          !Number.isInteger(offset) || offset < 0 || offset > 10000 ||
          !Number.isInteger(limit) || limit < 1 || limit > 100) throw new DatabaseError('INVALID_REQUEST', 400);
      const { url, key } = configuration();
      const endpoint = new URL(`/rest/v1/${resource}`, url);
      endpoint.search = new URLSearchParams({
        [resource === 'businesses' ? 'clerk_organization_id' : 'business_id']: `eq.${organizationId}`,
        select: '*', order: resource === 'businesses' ? 'clerk_organization_id.asc' : 'created_at.desc,id.desc',
        offset: String(offset), limit: String(limit)
      });
      let response;
      try { response = await request(endpoint, { headers: { apikey: key, Prefer: 'count=exact' }, signal: AbortSignal.timeout(15000), redirect: 'error' }); }
      catch { throw new DatabaseError('DATABASE_UNAVAILABLE'); }
      let body; try { body = await response.json(); } catch { throw new DatabaseError('DATABASE_UNAVAILABLE'); }
      if (!response.ok) {
        if (['PGRST205', '42P01'].includes(body?.code)) throw new DatabaseError('DATABASE_SCHEMA_REQUIRED');
        throw new DatabaseError('DATABASE_UNAVAILABLE');
      }
      if (!Array.isArray(body)) throw new DatabaseError('DATABASE_UNAVAILABLE');
      const total = response.headers.get('content-range')?.split('/')[1];
      return { records: body, total: /^\d+$/.test(total || '') ? Number(total) : null, offset, limit };
    }
  };
}
