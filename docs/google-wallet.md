# Google Wallet configuration

Issuer: `3388000000023226779`.
Service account: `vuelveclub-wallet@vuelveclub.iam.gserviceaccount.com`.

Server-only environment variables:
- `GOOGLE_WALLET_ISSUER_ID`: issuer ID, kept as a string.
- `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON`: complete service account JSON, stored as
  a Sensitive Secret in Vercel Production and in ignored `.env.local` locally.
  Do not return it from a config endpoint or include it in frontend bundles.

The downloaded key remains outside the repository. `.env.example` contains only
an empty credentials placeholder. Environment changes apply to new deployments.

Configuration verification: the key parses, its account matches the expected
service account, and Google's OAuth token endpoint accepts a signed RS256
assertion with the `wallet_object.issuer` scope. After enabling Google Wallet API
and authorizing the service account, a repeat issuer GET returned HTTP 200 for
`3388000000023226779`. This verifies authenticated issuer access. It does not
create passes and does not confirm publishing approval.

The service account must also be a Developer in the Wallet issuer's Users screen.
Once API access works, implement persistent enrollment records, loyalty classes
per business and individual loyalty objects before enabling the real Save to
Google Wallet flow. The current enrollment page is still a design preview.

Reference:
- https://developers.google.com/wallet/retail/loyalty-cards/getting-started/auth/rest
- https://developers.google.com/wallet/reference/rest/v1/issuer/get
