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
  return {
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
