import { createBusinessData } from '../lib/business-data.js';
import { DatabaseError } from '../lib/database.js';
import { ManagementError } from '../lib/management.js';
import { WalletError } from '../lib/google-wallet.js';
import { LogoError } from '../lib/business-logo.js';
import { managementHandler } from '../lib/management-handler.js';

export function createHandler({ service = createBusinessData(), verify } = {}) {
  return managementHandler(async ({ session, body, method, query, offset }) => {
    try {
      return method === 'GET' ? await service.read(session, query.organizationId, { view: query.view || 'card', query: query.search || '', offset }) : await service.write(session, body);
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof WalletError || error instanceof LogoError) throw new ManagementError(error.code, error.status);
      throw error;
    }
  }, verify ? { verify } : {});
}
export default createHandler();
