import { createDatabase, DatabaseError } from './database.js';
import { createManagement } from './management.js';
import { validateDesign, createWalletService } from './google-wallet.js';
import { verifyLogo } from './business-logo.js';

function documentUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || value.length > 1000) throw Error();
    return url.href;
  } catch { throw new DatabaseError('INVALID_REQUEST', 400); }
}
export function createBusinessData({ database = createDatabase(), management = createManagement(), env = process.env, logo = verifyLogo, wallet = createWalletService() } = {}) {
  return {
    async read(session, orgId, { view = 'card', query = '', offset = 0 } = {}) {
      if (!['card', 'customers'].includes(view)) throw new DatabaseError('INVALID_REQUEST', 400);
      const access = await management.businessAccess(session, orgId);
      if (!access.business) return { ...access, customers: [], customerCount: 0, design: null, active: null };
      const [business, records] = await Promise.all([
        database.syncBusiness(access.business),
        view === 'customers' ? database.customers(access.business.id, { query, offset }) : database.designs(access.business.id).then(designs => ({ designs }))
      ]);
      return { ...access, ...(view === 'customers' ? records : {
        design: records.designs.find(d => d.status === 'draft') || records.designs.find(d => d.status === 'active') || null,
        active: records.designs.find(d => d.status === 'active') || null
      }), enrollmentUrl: `https://app.vuelveclub.com/tarjeta/${business.enrollment_slug}` };
    },
    async write(session, input) {
      if (!['save', 'publish', 'recover'].includes(input.action)) throw new DatabaseError('INVALID_REQUEST', 400);
      const access = await management.businessAccess(session, input.organizationId, true);
      if (!access.business || !access.canManage) throw new DatabaseError('FORBIDDEN', 403);
      if (input.action === 'recover') return wallet.issueMember(await database.member(access.business.id, input.customerId));
      await database.syncBusiness(access.business);
      if (input.action === 'publish') {
        if (!/^[a-f0-9-]{36}$/.test(input.designId || '') || !Number.isInteger(input.revision)) throw new DatabaseError('INVALID_REQUEST', 400);
        return database.rpc('vc_publish_design', { p_business: access.business.id, p_design: input.designId, p_revision: input.revision });
      }
      const design = validateDesign(input.design);
      let logoUrl = null;
      if (design.logoToken) logoUrl = await logo(design.logoToken, session.userId, env);
      else if (input.design.keepLogo === true) {
        const drafts = await database.designs(access.business.id);
        logoUrl = (drafts.find(d => d.status === 'draft') || drafts.find(d => d.status === 'active'))?.logo_url || null;
      }
      const revision = input.revision ?? null;
      if (revision !== null && (!Number.isInteger(revision) || revision < 1)) throw new DatabaseError('INVALID_REQUEST', 400);
      if (input.design.termsVersion != null && typeof input.design.termsVersion !== 'string') throw new DatabaseError('INVALID_REQUEST', 400);
      const termsVersion = input.design.termsVersion?.trim() || null;
      if (termsVersion && (termsVersion.length > 100 || /[<>\x00-\x1f]/.test(termsVersion))) throw new DatabaseError('INVALID_REQUEST', 400);
      return database.rpc('vc_save_design', { p_business: access.business.id, p_user: session.userId, p_revision: revision,
        p_design: { ...design, logoToken: undefined, logoUrl, termsUrl: documentUrl(input.design.termsUrl), privacyUrl: documentUrl(input.design.privacyUrl), termsVersion } });
    }
  };
}
