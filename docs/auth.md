# Business sign-in

The landing links to https://app.vuelveclub.com/iniciar-sesion, a dedicated page without proposal navigation
or example-panel entry points. Legacy /propuestas/*#acceso links redirect there.
Ritmo also no longer renders the proposal comparison bar.

The root of app.vuelveclub.com redirects to /iniciar-sesion using a host-specific
Vercel redirect. A root rewrite was superseded because the existing static index
was served first. Other domains continue serving the landing at /.
The domain is assigned to vuelve-club-landing-page in the lead-scoop Vercel team
and verified with valid configuration. DNS uses Vercel nameservers. Apex and www
were not changed. HTTPS and the access-page assets are verified after deployment.

Clerk's prebuilt SignIn component handles credentials, recovery, MFA and OAuth.
Clerk JS v6 and UI v1 load from the Frontend API domain encoded in the publishable
key, following the official JavaScript quickstart. No credentials are submitted
to the static prototype or stored by our JavaScript. This page has no PostHog SDK.

Configure CLERK_PUBLISHABLE_KEY in Vercel and redeploy. Production accepts only
pk_live_ keys; development/preview may use pk_test_. Never expose sk_ secret keys.
The production publishable key provided for clerk.vuelveclub.com is configured
as a Vercel Production environment variable. Clerk DNS and certificates must be
deployed before that domain can serve the SDK and Frontend API.
The following CNAME records were added to Vercel DNS from the values supplied
by the application's Clerk Domains screen:
- clerk → frontend-api.clerk.services
- accounts → accounts.clerk.services
- clkmail → mail.dsrypv5tnlss.clerk.services
- clk._domainkey → dkim1.dsrypv5tnlss.clerk.services
- clk2._domainkey → dkim2.dsrypv5tnlss.clerk.services

All five resolve publicly. The user validated the records and deployed Clerk's
production TLS certificates. HTTPS to the current public Clerk IPs succeeds and
the real SDK loads in the browser. A stale recursive DNS response still resolved
clerk.vuelveclub.com to Vercel during initial checks; public-DNS-directed tests
preserved normal TLS certificate verification.

Production browser verification: the Spanish sign-in UI loads and Google OAuth
opens Google's official sign-in screen without a provider error. After the user
saved production Google credentials in Clerk, the authorization request includes
a client_id and uses https://clerk.vuelveclub.com/v1/oauth_callback. The previous
missing-client_id error is resolved. No real user's credentials or email codes
were submitted, so completion with a real account and its resulting session
remain unverified. The signed-in UI and sign-out destination were exercised with
a Clerk test double, not a real production account.
The HTML contains a skeleton only; it never renders a second login form. Clerk
is mounted in an inert, hidden region while its UI initializes. A DOM observer
waits for actual controls and two paint frames before revealing it. A reserved
card height keeps navigation and support links stable during this transition.

Configuration, SDK/UI scripts, localization, Clerk initialization and mounting
share a 30-second deadline. On failure the skeleton is replaced with a retry
action. Retrying cancels stale work, unmounts any existing Clerk component and
reuses successfully loaded scripts. Browser back/forward-cache restoration
rechecks the session without duplicating widgets. Loading uses aria-busy and an
external live status; hidden controls cannot receive focus. Reduced-motion
preferences disable shimmer and fade animations.

Clerk's card wrapper explicitly allows overflow, and the nested card no longer
uses its default negative margins. The last-authentication badge stays inset
inside its Google button, avoiding clipped text and input borders. Scoped label
and heading resets prevent prototype styles from adding unwanted margins to
Clerk controls. Verified with the real Clerk UI and the Google last-used badge
at 320/390/1280/1440/2463px; no horizontal page overflow or credentials submitted.

Enable Google in Clerk's SSO connections. A production instance needs custom
Google OAuth credentials, authorized origins and the redirect URI Clerk provides.
Do not send Google Client Secrets through chat or put them in frontend code.
The real Google button is rendered by Clerk according to that app's settings.
There is no static Google button or local password form.

The UI uses the official esMX localization from @clerk/localizations 4.24.0,
vendored as assets/vendor/clerk-es-MX.json with its MIT license. No runtime npm
dependency is added. Hanken Grotesk, Fredoka and the plum palette match VuelveClub.

Before opening customer business workspaces:
- Configure invite/restricted sign-ups for business owners and staff as appropriate.
- Organization memberships and admin/member roles now use Clerk, with live server checks (see docs/admin-and-team.md).
- Connect business records in Supabase, with tenant authorization and RLS policies.
- Protect APIs with verified Clerk sessions. A browser-only redirect is not access control.

After successful Clerk authentication the page obtains a session token and calls
GET /api/session. The server verifies its RS256 signature against the production
Clerk JWKS, issuer, lifetime, session ID and authorized origin. Pending sessions
are rejected. Responses are never cached. No email or role sent by the browser
can grant access.

VUELVE_ADMIN_USER_IDS is a server-only, comma-separated allowlist of immutable
production Clerk user IDs. The verified production account for
luismedlozn@gmail.com is configured in Vercel. This grants application admin
access, not access to Clerk's management console. Never authorize by a
browser-supplied email or role.

After authentication, admins go to /admin and business users go to /equipo,
keeping the loading skeleton visible until navigation. /admin lists real Clerk
organizations and users, with counts, search and pagination. Platform admins
can provision businesses for verified existing accounts and view each team's
access. A "Ver como cliente" button still opens the explicitly labeled sample
workspace. /equipo supports invitations, acceptance, admin/member roles, revocation
and membership removal. Its APIs verify current Clerk membership on every
request; changing the organization ID cannot grant access to another tenant.

CLERK_SECRET_KEY is required server-side for these management endpoints.
Organizations must be enabled in Clerk Production. Secret keys never appear in
public config responses or frontend files. See docs/admin-and-team.md for the
role policy, invitation flow, safeguards and verification limits.

The proposal routes continue to contain public example loyalty data. Their
Equipo navigation now goes to real account/team management. Business transaction
records, stamp recording, redemption and animated onboarding remain pending;
team membership does not make those prototype actions real.

Role tests use real generated RSA keys and signed tokens to cover admin/member
policy, forged claims, tampering, expiry, invalid origin/issuer, pending sessions
and unauthenticated requests. Browser UI checks use a Clerk test double; they do
not establish completion of a real user's production sign-in.

Loading regression verification: delayed configuration and delayed mounting;
network, SDK and mount failures with successful retries; deadline expiry and late
completion; back/forward restoration; stable loading/ready dimensions; no
horizontal overflow at 320/390/1440px; reduced motion. Real Clerk rendering was
also tested with the new local assets served under the production origin. No
production user credentials were submitted.

Sources:
- https://clerk.com/docs/js-frontend/getting-started/quickstart
- https://clerk.com/docs/js-frontend/reference/components/authentication/sign-in
- https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google
