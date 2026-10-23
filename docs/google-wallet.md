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
The dashboard's "Tu tarjeta" editor offers cream, lime and plum presets, custom
background color, business name, visit goal and reward. It previews supported
Google Wallet fields; Google controls the final native typography and layout.
Saving a draft uses the current browser's sessionStorage, not a business database.

Business logos: "Subir logo" accepts PNG, JPEG and WebP up to 2 MiB. POST
/api/wallet-logo verifies a Clerk session before decoding the upload. Sharp
rejects unsupported/animated images, limits decoded pixels, strips metadata,
normalizes orientation and produces a 1000x1000 PNG with 15% padding on each side
for Wallet's circular mask. The upload and image URLs are public branding assets,
not a place for customer data.

The public Vercel Blob store `vuelveclub-business-logos` is connected to this
project for production and development. BLOB_READ_WRITE_TOKEN is server-only;
never include it in a public config endpoint. The store connection also supplies
BLOB_STORE_ID. Explicit token credentials are used when configured. Local secrets
remain in ignored .env.local. No new database or consumer enrollment is enabled.

Each immutable logo pathname contains a hash of the verified owner ID and a
hash of the normalized image. Upload responses contain the public URL and a
one-year signed capability bound to that user. Issuance verifies that capability
and derives the logo URL from it; arbitrary URLs or another user's token cannot
select the logo. Signing uses a separate domain-derived key from server-side
Wallet credentials; rotating those credentials requires reuploading old logos.

Test cards v3 use the business logo as programLogo, the business name as
issuerName, and retain "Powered by vuelveclub" in card details. The downloadable
QR poster retains its VuelveClub attribution. Removing a logo restores the
VuelveClub placeholder. Preview and draft restore use the same public image.
Generate a new card after changing the logo; existing v1/v2 test cards remain
unchanged. A real public upload and Google class/object creation with that logo
passed; saving into a user's actual Wallet still requires that user's Google
session. Server tests cover normalization, bad files, account isolation, signing
and API access; browser checks cover loading, retryable failures, save/reload,
remove and mobile layouts.

Test card version v2 adds outlined heart stamps using the supported `heroImage`
field. Eight transparent 1032x812 PNGs cover goals 5/8/10/12 in dark and light
ink. The preview uses the same PNG as the real card, choosing contrast based on
background luminance. Images have no customer data and are hosted publicly over
HTTPS. All stamps start empty, matching 0 visits; visit recording and dynamic
image updates remain pending. New resource IDs leave previous v1 test cards
unchanged: generate a new test card to see the stamps.

POST /api/wallet-test verifies a production Clerk session and accepts only the
validated design, never browser-supplied resource IDs or account identity. Every
signed-in user may create test cards for their own account. Classes and objects
are keyed by a hash of the verified user ID and normalized design, so identical
retries reuse the resources and users cannot overwrite each other's test cards.
Design changes create a new immutable test class/object. No existing passes are
updated. Google credentials and OAuth tokens remain server-side.

Each card is visibly marked as a test, uses the fictitious name Alex Demo and has
no commercial value. The server creates real loyalty resources, then signs a
24-hour Save to Google Wallet JWT referencing the saved object. The dashboard
displays that URL as a QR and offers an open link and QR download. The internal
barcode identifies a test card; it is not an operational stamp or redemption
credential. The Add QR is for a single test card, not business-wide enrollment.

QR downloads are self-contained 1600x2100 PNG posters with the business name,
brand colors, a scan instruction, and the "Powered by vuelveclub" logo footer.
Fonts and the logo are rasterized into the file. Both the test-card and example
enrollment downloads use this layout. Integer QR scaling preserves square
modules and the existing white quiet zone. Test-card posters retain the 24-hour
link-expiry notice. Both exported PNGs were decoded back to their original URLs
during browser verification.

Google accepted the first test loyalty class and object during verification.
Saving to a real user's Android Wallet still requires that user's Google session
and was not completed by automated checks. Browser tests cover presets, live
preview, draft saving, sign-in/error/loading states, the QR and downloads at
320/390/1440px. Server tests cover resource isolation, retry reuse, JWT signature,
expiry, configuration failure and HTTP authorization.

The user explicitly chose test cards while Supabase is pending. Implement
persistent enrollment records and tenant membership authorization before enabling
real consumer registration and reward operations. The current public enrollment
page remains an explicitly labeled design preview and collects no server data.

Reference:
- https://developers.google.com/wallet/retail/loyalty-cards/getting-started/auth/rest
- https://developers.google.com/wallet/reference/rest/v1/issuer/get
