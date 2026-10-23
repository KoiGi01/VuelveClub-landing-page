# Administration and business teams

Routes: `https://app.vuelveclub.com/admin` and `/equipo`.
Both serve the branded portal shell with skeleton loading, bounded requests,
failure/retry states, mobile navigation, desktop sidebar collapse and reduced
motion. No private user or organization data is embedded in static HTML.

## Authorities and configuration

- Platform admin: immutable verified Clerk user IDs in server-only
  `VUELVE_ADMIN_USER_IDS`. The account for `luismedlozn@gmail.com` was looked up
  through the production Backend API and its matching email was verified before
  configuring the allowlist. A business admin cannot grant platform admin access.
- Business Administrator: current Clerk membership role `org:admin`.
- Business Personal: current membership role `org:member`, with team read access
  but no ability to invite, change roles, remove members or revoke invitations.

`CLERK_SECRET_KEY` is a Vercel Production Sensitive Secret, also configured in
ignored `.env.local` for development. Clerk Organizations must be enabled. No
secret is returned from public configuration endpoints. No new secret is stored
in the repository. If a secret was shared through chat, rotate it in Clerk and
replace the server environment value.

## Server endpoints

GET `/api/admin`: platform-admin-only real business/user lists and counts. Search
and 20-record pagination are supported. Responses omit provider metadata and
private authentication fields. POST creates a business only for an existing
account with an exactly matching verified owner email. Clerk assigns that owner
the organization admin role. A stable owner/name-derived slug avoids duplicate
organizations from retrying the same create request.

GET `/api/team`: lists the caller's organization memberships (up to 100), then
checks the caller's current membership for the requested business before loading
its members. Platform admins may inspect any business. The member list is
paginated in groups of 20. Pending invitations (up to 100) are returned only to
business administrators/platform admins.

POST `/api/team`: invite, change role, remove membership or revoke invitation.
Every mutation checks the caller's current organization membership via Clerk's
Backend API, rather than trusting a potentially stale JWT org role or a browser
flag. Only `org:admin` and `org:member` may be assigned. Organization creators and
the caller's own membership cannot be removed or demoted through this API. Removing
a business membership does not delete the person's Clerk account.

Both APIs verify the production Clerk session JWT, check request method and
mutation origin, return `Cache-Control: no-store`, and expose sanitized errors.
Role changes do not alter other business memberships. Provider-level Clerk
administrators still retain their own direct management authority.

## Invitations and UI

Invitations are sent only when a user submits "Enviar invitación". They expire
after seven days and redirect to the branded Clerk sign-in page. Its unified
sign-in/sign-up flow supports new staff accounts. After login the portal also
lists the current user's pending invitations via Clerk JS. Accepting an invitation
uses that invitation's `accept()` method and then refreshes server membership.
No arbitrary ticket is accepted by a custom unauthenticated backend endpoint.

The old browser-only team simulator is no longer the team management entrypoint.
The public sample workspace links to `/equipo`; test-card links from the portal
retain the sample-data banner.

## Verification and remaining scope

Live, read-only production checks confirmed admin business/user counts and
the real owner's organization membership. No QA emails were sent and no real
memberships were changed in testing. Provider writes were exercised with mocks,
including admin/staff isolation, owner protection, rejected cross-business access,
verified-owner provisioning, invite roles and revocation requests.

Browser checks cover admin/owner/staff views at 320/390/1440px, search and keyboard
shortcut, navigation, modal forms, hidden staff management controls, invite
acceptance, error retry, login redirects and mobile overflow. These browser checks
use a Clerk test double; real end-to-end email delivery and invite acceptance
still require the actual invited user's account.

Loyalty customers and transactions still have no Supabase database. Visits,
redemptions and customer lists in the sample workspace remain simulations.
The two business roles currently govern real team management; permission checks
must be applied to future business data endpoints when those are implemented.
The animated onboarding remains deferred.

References:
- https://clerk.com/docs/guides/organizations/control-access/roles-and-permissions
- https://clerk.com/docs/reference/backend-api
- https://clerk.com/docs/guides/development/custom-flows/organizations/manage-user-org-invitations
- https://clerk.com/docs/guides/development/custom-flows/organizations/accept-organization-invitations
