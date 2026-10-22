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
Until configured, Google and email controls remain disabled with an availability
message. This is intentional: entering any password no longer opens mock data.

Enable Google in Clerk's SSO connections. A production instance needs custom
Google OAuth credentials, authorized origins and the redirect URI Clerk provides.
Do not send Google Client Secrets through chat or put them in frontend code.
The real Google button is rendered by Clerk according to that app's settings.
The static Google button is only the unavailable-state presentation.

Before opening customer business workspaces:
- Configure Spanish localization in Clerk and branding/production domain settings.
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
