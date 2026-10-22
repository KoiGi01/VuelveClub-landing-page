import { createRemoteJWKSet, jwtVerify } from 'jose';

const ISSUER = 'https://clerk.vuelveclub.com';
const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`), { timeoutDuration: 5000 });

export async function verifySession(req, {
  keySet = jwks,
  issuer = ISSUER,
  authorizedParties = ['https://app.vuelveclub.com'],
  adminUserIds = (process.env.VUELVE_ADMIN_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean)
} = {}) {
  const authorization = req.headers?.authorization || '';
  if (typeof authorization !== 'string' || authorization.length > 16000 || !authorization.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const { payload } = await jwtVerify(authorization.slice(7), keySet, {
    issuer, algorithms: ['RS256'], requiredClaims: ['sub', 'sid', 'exp', 'iat', 'nbf'], clockTolerance: 5
  });
  if (typeof payload.sub !== 'string' || !payload.sub.startsWith('user_') ||
      typeof payload.sid !== 'string' || !payload.sid.startsWith('sess_') ||
      (payload.azp && !authorizedParties.includes(payload.azp)) || payload.sts === 'pending') {
    throw new Error('Unauthorized');
  }
  // Roles are assigned to immutable Clerk user IDs on the server, never emails
  // supplied by a browser or values from unsafeMetadata/local storage.
  const role = adminUserIds.includes(payload.sub) ? 'admin' : 'member';
  return { userId: payload.sub, role, canPreview: role === 'admin' };
}
