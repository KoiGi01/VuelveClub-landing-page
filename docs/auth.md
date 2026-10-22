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

Production browser verification: the Spanish sign-in UI loads, Google is enabled
in Clerk's public environment config, and the Google button initiates OAuth.
The provider currently rejects that request with "Missing required parameter:
client_id". Production Google credentials must be saved in Clerk before this
connection is operational. No real user's credentials or email codes were submitted.
Until configured, Google and email controls remain disabled with an availability
message. This is intentional: entering any password no longer opens mock data.

Enable Google in Clerk's SSO connections. A production instance needs custom
Google OAuth credentials, authorized origins and the redirect URI Clerk provides.
Do not send Google Client Secrets through chat or put them in frontend code.
The real Google button is rendered by Clerk according to that app's settings.
The static Google button is only the unavailable-state presentation.

The UI uses the official esMX localization from @clerk/localizations 4.24.0,
vendored as assets/vendor/clerk-es-MX.json with its MIT license. No runtime npm
dependency is added. Hanken Grotesk, Fredoka and the plum palette match VuelveClub.

Before opening customer business workspaces:
- Finish Clerk production domain settings and Google OAuth credentials.
- Configure invite/restricted sign-ups for business owners and staff as appropriate.
- Implement organization memberships and roles, verified on server-side endpoints.
- Connect business records in Supabase, with tenant authorization and RLS policies.
- Protect APIs with verified Clerk sessions. A browser-only redirect is not access control.

After successful Clerk authentication the page shows the signed-in account with
Clerk's UserButton; it does not redirect into or claim to secure the prototype
workspace. The existing proposal routes still contain public example data only.

Sources:
- https://clerk.com/docs/js-frontend/getting-started/quickstart
- https://clerk.com/docs/js-frontend/reference/components/authentication/sign-in
- https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google
