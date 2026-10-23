# Supabase foundation

Clerk remains the source of authentication and current business memberships.
Supabase stores business data. The project API URL and `sb_secret_` key live only
in ignored `.env.local` and server environment variables, never frontend config.
The dashboard URL is not the Data API endpoint.

The initial migration was applied to the configured project on 2026-10-23.
All six Data API resources passed a live read-only check. Production Vercel has
the project URL and secret key as sensitive environment variables; the database
password remains local. No simulated customers or business records were imported.

## Apply the initial schema

Run `node --env-file=.env.local scripts/migrate-database.js` with either
`SUPABASE_DB_PASSWORD` (direct IPv6 connection) or `SUPABASE_DB_URL` (a direct or
session-pooler connection). The tool verifies Supabase's TLS certificate, records
migration checksums, serializes runs and skips already applied migrations. The
password stays local. Alternatively run
`supabase/migrations/202610230001_initial.sql` once in the project's SQL Editor;
manual execution does not populate the tool's migration ledger, so choose one
method. The migration runs in a transaction and creates six empty tables:
businesses (keyed by Clerk organization ID), customers, card designs, loyalty
cards, visits and redemptions. It never imports simulated customers or issues
Wallet passes. Existing tables with matching names cause a safe rollback rather
than an overwrite; review their schema before applying to a nonempty project.

Then run:

```
node --env-file=.env.local scripts/check-database.js
```

This read-only check verifies all six resources without displaying private data.
It distinguishes a missing schema from a genuinely empty business.

## Isolation

All tables have RLS enabled with no browser-access policies, and grants for anon
and authenticated roles are revoked. Server-only service access bypasses RLS;
therefore every future HTTP data handler MUST verify the Clerk JWT and current
business membership before calling `lib/database.js`. Platform administration
uses the existing server-side user-ID allowlist. The database helper enforces
tenant filters and bounded pagination but is not itself an authorization layer.

Composite foreign keys prevent a business's loyalty card from referring to
another business's customer/design, and its visits/redemptions from referring to
another business's card. Per-business event idempotency keys prevent duplicate
event inserts. Customer terms acceptance is required independently of optional
marketing consent. Memberships and login identities are not duplicated here.

## Current activation boundary

Connection verification and schema preparation do not enable real registration,
customer dashboards or reward operations. No new HTTP data route is exposed by
this foundation. The existing sample workspace remains explicitly simulated;
Google Wallet issuance remains test-only. After applying the schema, implement
authorized customer/design endpoints and replace the relevant browser state.
Visit/redemption mutations need transactional balance checks, deduplication and
Wallet update retries before their production UI is enabled.

Verification includes 38 passing Node checks and an isolated PostgreSQL-engine
run of the actual SQL migration: all six tables enforce RLS, mismatched tenant
foreign keys fail, and anonymous/authenticated roles cannot read customers.
The production migration tool's second run skipped the already-applied migration.

References:
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/database/secure-data
