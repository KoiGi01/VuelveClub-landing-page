import { createManagement } from '../lib/management.js';
import { managementHandler } from '../lib/management-handler.js';
const management = createManagement();
export default managementHandler(({ session, body, method, query, offset }) =>
  method === 'GET' ? management.team(session, query.organizationId, offset) : management.mutateTeam(session, body));
