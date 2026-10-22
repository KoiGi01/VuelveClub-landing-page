# Landing analytics

PostHog runs only on the landing page in Vercel production. The public project
token for the connected US Cloud project is configured in api/analytics-config.js.
This ingestion token is intentionally public; no personal API key is used.
POSTHOG_PROJECT_TOKEN and POSTHOG_REGION (US or EU) environment variables can
override the project configuration. Set an empty POSTHOG_PROJECT_TOKEN to disable
capture, then redeploy. Local development and Vercel previews remain disabled.

In PostHog, enable web session replay and choose the recording sample rate and
retention appropriate to the project. Verify an actual production visit appears
in Live events and Recordings after activation. Capture can be blocked by browser
privacy tools, so counts are observational rather than a complete sales ledger.

Create a funnel with $pageview → demo_cta_clicked → demo_form_started →
demo_form_success. Also create the shorter $pageview → demo_form_success funnel
because visitors can scroll directly to the form without clicking a CTA.
Use source/location to compare entry points and replay links to inspect drop-offs.

Events:
- demo_cta_clicked: location (header, hero, pricing, footer).
- login_clicked; contact_clicked: location and channel.
- demo_form_started: first input, once per page load.
- demo_form_submitted: valid attempt, before calling the lead API.
- demo_form_success: only after a successful HTTP response with {ok:true}.
- demo_form_error: timeout or delivery_failed; no server error text or form values.
- demo_form_abandoned: pagehide after input without a confirmed success; best
  effort only (mobile exits and in-flight requests can affect interpretation).
- scroll_depth: 25/50/75/90/100, each once per page load; percentage of page height
  reached by the viewport's bottom, including the initial viewport.
- section_viewed: hero/comparacion/metricas/features/precio/demo, once per load.

Build a scroll-depth insight broken down by depth, and a section_viewed insight
broken down by section. Click heatmap capture is enabled in the web SDK.

Privacy configuration: anonymous visitors, no identify calls or person profiles,
explicit events instead of DOM autocapture, all form inputs masked in replay,
status/error/private text masked, network bodies and headers disabled, console
recording disabled. Automatic event URL query strings/fragments are removed;
replay URL redaction also removes queries/fragments. Do not put personal data in
URL paths or public page copy. Attribution query values are intentionally omitted.
No SDK is installed on support, enrollment, or platform prototype pages.

References:
- https://posthog.com/docs/libraries/js
- https://posthog.com/docs/libraries/js/config
- https://posthog.com/docs/session-replay/privacy
- https://posthog.com/docs/session-replay/network-recording
