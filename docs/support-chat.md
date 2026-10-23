# Customer support chat and email

The floating help button uses the supplied support avatar, plum/cream/lime palette
and Fredoka/Hanken Grotesk typography. The original PNG is preserved; the widget
and support page use the smaller WebP. The widget is a shadow-DOM component on the
landing, support, login, business portal, enrollment and proposal pages. The panel
opens on demand, with keyboard Escape, a labeled conversation log, mobile viewport
sizing and reduced motion. No AI request is made until the visitor asks a question.

## Answers and navigation

POST `/api/chat` calls Gemini on the server with `GEMINI_API_KEY` and
`GEMINI_CHAT_MODEL` (default `gemini-3.5-flash-lite`). The current help knowledge
is in `lib/support-knowledge.js`. It distinguishes live Google Wallet/customer
registration from pending Apple Wallet, visit recording, redemptions and NFC
authorization. It never has database/account access or tools to perform actions.
Keep that source current when features or pricing change.

The request contains at most 12 alternating user/assistant messages, 8,000 total
characters, and a public page category. It does not automatically attach Clerk
identity, user email, business records, URLs or credentials. Gemini receives the
visitor's typed conversation. The server supplies a fixed JSON output schema and
validates the response. Errors, timeouts and invalid output return an email
handoff rather than invented success or provider diagnostics.

The model selects section IDs, never destination URLs. `chat/links.js` supplies
allowlisted routes and canonical labels. Highlighted text inside an answer is
clickable. Landing links scroll to and briefly outline the requested section;
business links keep the selected organization and use in-page portal navigation
without reloading Clerk. Model output is inserted as text nodes, never HTML.

Conversation state is page memory only. The entire widget is blocked from
PostHog replay; no chat text or email fields are captured as analytics events.

## Handoff and forms

When the visitor requests the team or the assistant cannot resolve a product
question, a short form asks for name, email and their query. Signed-in users can
have their own name/email prefilled locally. Only submitting the form sends the
query plus the last six conversation messages to `/api/support`. The UI states
what will be shared. A handoff is never claimed sent until the email API confirms
success. Failures preserve form data and permit a retry.

- Chat and support-form mail goes to `support@vuelveclub.com`.
- Landing lead forms go to `luismedlozn@gmail.com` AND `support@vuelveclub.com`.
- Both use the same replaced `RESEND_API_KEY`, server-side. The sender is
  `support@vuelveclub.com`, and Reply-To is the visitor's email.
- Environment recipient values accept comma-separated emails. Browser input
  never chooses recipients. Inputs are validated and HTML-escaped.
- Form retries have stable Resend idempotency keys until the submitted content
  changes; errors never report a successful send.

The new Resend key was validated and configured in Vercel Production/Preview.
Gemini key/model and mail recipient/sender variables are configured in Production.
The Resend domain `vuelveclub.com` is verified: added DKIM TXT at
`resend._domainkey`, return-path MX/TXT at `send`, and CNAME at `rsend`. Existing
Google Workspace root MX/SPF and Clerk records were preserved. Secrets are only
in ignored `.env.local` and Vercel sensitive environment variables.

## Limits and verification

Migration `202610230003_support_limits.sql` provides shared PostgreSQL quotas:
20 chat requests per IP per ten minutes, 2,000 AI requests globally per day,
and five mail submissions per IP per form category per hour. IPs are HMAC-hashed;
counter rows expire after two days. Browser database roles cannot read/write the
table or invoke the RPC. In production, missing storage configuration or an
unavailable limiter fails closed. POST chat requires an allowed site origin.
Mail endpoints reject foreign browser origins and include honeypot fields.

62 Node tests pass, including typed response validation, external-link rejection,
AI outages, fixed recipients, idempotency, rate limits and PostgreSQL permissions.
Browser checks at 320/390/1440 px cover opening, focus, section links, private
conversation state, email failure/retry, preserved fields, signed-in prefills and
business navigation without a second Clerk load. Live Gemini tests covered a
normal answer, follow-up, unsupported functionality, human handoff and prompt
injection. Resend credentials/domain verification were checked read-only; no
sample tickets or leads were emailed to the user's inboxes during QA.

References:
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/generate-content/structured-output
- https://posthog.com/docs/session-replay/privacy
