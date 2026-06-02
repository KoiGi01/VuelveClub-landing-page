# Lead Acquisition — Design

**Date:** 2026-06-01
**Status:** Approved

## Problem

The VuelveClub landing site has two lead-capture forms — the hero email form
(`form.signup[data-demo]`) and the demo CTA form (`form.demo-form[data-demo]`).
Both currently call `preventDefault()` and only fake a confirmation, discarding
the submitted data ([app.js:243-249](../../../app.js#L243-L249)). No lead is
ever captured. We need real lead delivery.

## Goal

When a visitor submits either form, the lead is delivered by email to the
business, with clear success/error feedback in the UI. No leads are silently
lost.

## Decisions

- **Delivery:** email. Recipient is `luismedlozn@gmail.com` for now, switching
  to `hola@vuelveclub.com` once that mailbox exists (env-var change, no code
  change).
- **Hosting:** Vercel (serverless functions available).
- **Send method:** a serverless function emailing via **Resend** (SDK). API key
  already provisioned.
- **Spam protection:** hidden honeypot field, validated server-side.

## Architecture

Two pieces: a serverless endpoint and the frontend wiring. They communicate over
a single JSON `POST` interface.

### Interface: `POST /api/lead`

Request body (JSON):

| Field      | Type   | Required | Notes                                        |
|------------|--------|----------|----------------------------------------------|
| `source`   | string | yes      | `"hero"` or `"demo"` — identifies which form |
| `email`    | string | yes      | validated server-side                        |
| `nombre`   | string | no       | demo form only                               |
| `negocio`  | string | no       | demo form only                               |
| `whatsapp` | string | no       | demo form only                               |
| `tipo`     | string | no       | demo form only (business type)               |
| `company`  | string | no       | **honeypot** — must be empty                  |

Responses:

- `200 { ok: true }` — lead accepted and email sent.
- `400 { ok: false, error }` — invalid email or missing required field.
- `405` — method other than POST.
- `502 { ok: false, error }` — Resend send failed.

The honeypot being non-empty returns `200 { ok: true }` (silently dropped — we
don't tell bots they were caught).

### Component: `api/lead.js` (Vercel Node function)

Responsibilities, in order:

1. Reject non-POST methods (405).
2. Parse JSON body.
3. If `company` (honeypot) is non-empty → return `200 { ok: true }`, send
   nothing.
4. Validate `email` (basic shape) and `source`; on failure return 400.
5. Build a plain-text + simple HTML email summarizing the lead (subject includes
   `source` and business name when present).
6. Send via Resend SDK using env config.
7. Return 200 on success, 502 on Resend error (logged server-side).

Env config (no secrets in code):

- `RESEND_API_KEY` — required.
- `LEAD_TO_EMAIL` — default `luismedlozn@gmail.com`.
- `LEAD_FROM_EMAIL` — default `onboarding@resend.dev`.

Dependency: `resend`, declared in a new root `package.json` so Vercel installs
it during build.

### Component: frontend handler (`app.js`)

Replaces the current no-op submit handler for `form[data-demo]`:

1. `preventDefault()`.
2. Read fields from the form; read `source` from the form's `data-source`
   attribute.
3. Set button to a loading state ("Enviando…"), disable re-submit.
4. `await fetch('/api/lead', { method:'POST', headers, body: JSON.stringify(...) })`.
5. On `ok`: show success text ("¡Listo! Te contactamos ✦"), reset form after a
   delay (preserve existing timing/feel).
6. On failure (network or non-ok): show a visible inline error message and
   restore the button so the user can retry — never a silent failure.

The hero form sends only `email` (+ `source: "hero"`); the demo form sends all
fields (`source: "demo"`).

### HTML changes

For each form:

- Add `data-source="hero"` / `data-source="demo"`.
- Add a visually-hidden honeypot input named `company` (off-screen via CSS,
  `tabindex="-1"`, `autocomplete="off"`).
- Add an empty inline element for the error message, hidden until needed.

## Local development

`python -m http.server` cannot execute `/api`. Local testing uses `vercel dev`,
which serves the static files and the function together. The Resend key lives in
a gitignored `.env` (or `.env.local`) for local runs and in Vercel project env
vars for production. A `.gitignore` will exclude `.env*` and `node_modules`.
CLAUDE.md is updated to document `vercel dev` and the env vars.

## Error handling summary

- Invalid/missing input → 400, surfaced as inline error in the form.
- Resend failure → 502, surfaced as inline error; visitor can retry.
- Honeypot tripped → silent 200, no email.
- Network failure on the client → inline error, button restored.

## Out of scope (YAGNI)

- Persisting leads to a database/sheet.
- Autoresponder email to the visitor.
- Rate limiting beyond the honeypot.
- Analytics/conversion tracking.

These can be layered onto `api/lead.js` later without changing the interface.

## Testing

- Manual via `vercel dev`: submit hero form (email only) and demo form (all
  fields); confirm email arrives and UI shows success.
- Honeypot: populate `company` via devtools → expect 200 and no email.
- Invalid email → expect inline error.
- Resend failure path: temporarily use a bad key → expect inline error, no
  crash.
