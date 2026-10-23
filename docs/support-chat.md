# Customer support chat and email

The floating help button uses a chat bubble icon, plum/cream/lime palette
and Fredoka/Hanken Grotesk typography. Mía's supplied portrait appears inside the
open chat only. The original PNG is preserved; the widget header and support page
use the smaller WebP. The widget is a shadow-DOM component on the
landing and business portal only. Login, support, enrollment and proposal pages
do not load it; a runtime route guard also prevents mounting there. The panel
opens on demand, with keyboard Escape, a labeled conversation log, mobile viewport
sizing and reduced motion. No AI request is made until the visitor asks a question.
The assistant's name is Mía, configured in `chat/contact.js`. Its header says
Asistente virtual, and its initial greeting introduces Mía. The permanent team
contact button has been removed.

The local welcome arrives after 10 seconds on a visible page, without an AI
request. A lime unread count, a single short nudge and a seven-second preview
announce it without opening the panel or taking focus. Opening the chat clears
the count. A session-only greeting flag prevents repeated alerts during page
navigation while keeping an unread welcome badge until opened. Storage failures
do not prevent using the widget. An assistant reply arriving after the user
closes the panel also raises an unread notification. Reduced-motion preferences
disable the animations.

The notification uses the supplied `confirm.wav`, preserved as
`assets/chat-notification.wav` (0.22 seconds, PCM WAV), at 45% volume. The landing
and dashboard configure its URL with the `vuelve-chat-notification-sound` meta
tag. Only same-origin audio is accepted; it is loaded when a notification plays.
A browser-blocked sound can retry on the next user interaction within 12 seconds,
while the message is still unread;
opening the chat cancels it. Missing audio never blocks the chat.

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
visitor's typed conversation. Replies target one or two short sentences, with a
60-word/420-character server cap. The server supplies a fixed JSON output schema and
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
question, a short form asks only for name and email. The question is already in
the conversation; no extra message field is requested. Signed-in users can
have their own name/email prefilled locally. Only submitting the form sends the
query plus the last six conversation messages to `/api/support`. The UI states
what will be shared. A handoff is never claimed sent until the email API confirms
success. Failures preserve form data and permit a retry.

Commercial questions (pricing, plans, a demo, contracting or requested information)
first offer name/email collection. Obvious questions use a deterministic gate;
Gemini can also flag semantic sales intent. After the two fields, Mía asks whether
the visitor prefers information by email or WhatsApp. Only WhatsApp requests a
phone number, normalized with country code. The visitor can decline contact and
continue asking questions. Consent is requested before sending; opening the chat
or entering the fields alone never sends an email.

Selecting a channel sends a chat lead to both owner/support inboxes with the
question, transcript and chosen follow-up channel. This requests team follow-up;
it does not automatically message the consumer or send WhatsApp messages. After
delivery is confirmed, the chat resumes the original question. It remembers the
choice for this page session and does not repeat the intake on every commercial
question. Name/email/phone collected by the UI stay out of Gemini requests; only
an intake-complete boolean is sent. Errors can be retried with the exact same
payload and idempotency key. Switching channels creates a new key.

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

67 Node tests pass, including typed response validation, external-link rejection,
AI outages, fixed recipients, idempotency, rate limits and PostgreSQL permissions.
Browser checks at 320/390/1440 px cover opening, focus, section links, private
conversation state, email failure/retry, preserved fields, signed-in prefills and
business navigation without a second Clerk load. Intake checks cover both
contact channels, conditional phone validation, declining capture, retry stability
and hidden login widgets. Live Gemini tests covered a
normal answer, follow-up, unsupported functionality, human handoff and prompt
injection. Resend credentials/domain verification were checked read-only; no
sample tickets or leads were emailed to the user's inboxes during QA.
Notification browser checks at 320/390/1440 px cover icon-only launchers, unread
counts and previews, no unsolicited AI/audio requests, focus preservation,
session deduplication, replies while closed, blocked storage and reduced motion.
Mocked audio verifies autoplay rejection/retry and canceling playback on open.
Real browser playback verifies the supplied WAV decodes on the landing and app,
plays once at the ten-second alert, and is canceled if the chat was already read.
Targeted accessibility scans pass for the closed notification and open panel.

References:
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/generate-content/structured-output
- https://posthog.com/docs/session-replay/privacy
