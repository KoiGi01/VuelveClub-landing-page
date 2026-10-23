import { createManagement, ManagementError } from '../lib/management.js';
import { managementHandler } from '../lib/management-handler.js';
const management = createManagement();
export default managementHandler(async ({ session, body, method, query, offset }) => {
  if (method === 'POST') {
    if (body.action !== 'create') throw new ManagementError('INVALID_REQUEST');
    return management.createBusiness(session, body);
  }
  if (typeof (query.search || '') !== 'string' || (query.search || '').length > 60) throw new ManagementError('INVALID_REQUEST');
  return management.adminData(session, { view: query.view || 'businesses', query: query.search || '', offset });
});
