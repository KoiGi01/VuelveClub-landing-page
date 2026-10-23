# Supabase foundation

Clerk remains the source of authentication and current business memberships.
Supabase stores business data. The project API URL and `sb_secret_` key live only
in ignored `.env.local` and server environment variables, never frontend config.
The dashboard URL is not the Data API endpoint.

The initial and registration migrations were applied to the configured project on 2026-10-23.
All six Data API resources passed a live read-only check. Production Vercel has
the project URL and secret key as sensitive environment variables; the database
password remains local. The existing verified Clerk organization was mirrored;
no simulated customers were imported and no program was published for QA.

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
therefore every authenticated HTTP data handler MUST verify the Clerk JWT and current
business membership before calling `lib/database.js`. Platform administration
uses the existing server-side user-ID allowlist. The database helper enforces
tenant filters and bounded pagination but is not itself an authorization layer.

Composite foreign keys prevent a business's loyalty card from referring to
another business's customer/design, and its visits/redemptions from referring to
another business's card. Per-business event idempotency keys prevent duplicate
event inserts. Customer terms acceptance is required independently of optional
marketing consent. Memberships and login identities are not duplicated here.

## Live business flow

Open a business in `/admin`, then use its Clientes, Tu tarjeta and Equipo tabs.
Regular business users have the same destinations in their sidebar. The editor
saves drafts to Supabase, including an optional verified uploaded logo. Staff can
read but cannot save, publish or recover someone else's Wallet link. Publishing
requires HTTPS terms/privacy URLs and a document version supplied by the business.
No placeholder legal documents are treated as consent for real registration.

GET `/api/business?organizationId=org_...&view=card|customers` checks fresh Clerk
membership, mirrors the verified organization, and returns the selected data.
Customer lists use 20-record pagination and scoped name/email/phone search. POST
actions `save`, `publish` and `recover` require current business administrator or
platform administrator access. Logo URLs come from a verified upload token or a
previously saved design, never an arbitrary request URL. Draft revision checks
prevent a second window from silently overwriting a newer save.

The business has a stable, random registration URL at `/tarjeta/<UUID>`. Its QR
is displayed in a branded frame and downloads as a PNG with Powered by vuelveclub.
GET `/api/enrollment?slug=...` exposes only the active design and its documents.
POST requires name, email, phone and explicit terms acceptance; no Clerk login is
required. Consent version and server timestamp are saved separately from marketing
consent (false by default). Email/phone are self-reported, not marked verified.

Registration is a single PostgreSQL transaction. Business row locks serialize it
with publishing; a design/version mismatch asks the user to reload. A random
browser capability, stored only in sessionStorage, is hashed in the database.
Its payload fingerprint makes retries return the same immutable card without
overwriting customer details. A new capability with an existing email cannot
retrieve that customer's card; a business administrator can recover its Wallet
link through the customer table. The public endpoint has a shared PostgreSQL
limit of 30 validated attempts per IP per 10 minutes, using HMAC-hashed IPs and
one-day cleanup. It does not expose privileged RPCs to browser database roles.

Google issuance happens after committing the customer/card. If Google fails,
the same registration can retry without duplication. Existing Google objects
are never reset on retry. Publishing a new design archives the old version;
previously issued cards keep their immutable design. The public profile never
returns contact data, enrollment capabilities or creator metadata.

## Verification and remaining scope

52 Node checks cover schema execution, tenant foreign keys, role isolation,
draft conflicts, publication, duplicate registrations, consent, retries, rate
limits, recovery authorization and Wallet JWTs. Browser checks at 320/390/1440 px
exercise saved-design reload, legal gating, publishing, registration, Google
failure/retry, customer search, staff controls and overflow using isolated
PostgreSQL and provider test doubles. The downloaded PNG was decoded back to its
business URL. Live read-only checks verified real Clerk/Supabase access, stable
URLs and zero customer records; no QA customers or Wallet memberships were issued
in production. Saving a new real membership to a person's Google Wallet still
requires that person's Google session and has not been automated.

The `/propuestas` workspace and cafe-buen-dia enrollment route remain labeled
simulations. Apple Wallet, visit recording, redemptions and NFC authorization
remain pending; their existing example actions are not live operations. Real
visit/redemption mutations need transactional balance checks and Wallet updates.

References:
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/database/secure-data
