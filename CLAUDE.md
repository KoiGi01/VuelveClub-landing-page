# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page marketing landing site for **VuelveClub**, a digital loyalty-card product (NFC stamp + Apple/Google Wallet) sold to Mexican small businesses. Copy is in Mexican Spanish (`lang="es-MX"`). The site itself is static HTML/CSS/JS; lead capture is handled by a single Vercel serverless function (`api/lead.js`). Deployed on Vercel.

## Running / developing

For pure markup/style/animation work, open [VuelveClub.html](VuelveClub.html) directly, or serve over HTTP so relative paths and `IntersectionObserver` animations behave like production:

```powershell
python -m http.server 8000   # http://localhost:8000/VuelveClub.html  — does NOT run /api
```

To exercise the lead form end-to-end you need the serverless function, which only runs under Vercel:

```powershell
npm install        # installs the `resend` dependency
vercel dev         # serves static files + /api/lead together
```

Env vars (copy `.env.example` → `.env` for local `vercel dev`; set the same in the Vercel project for production):
- `RESEND_API_KEY` — required, the Resend key.
- `LEAD_TO_EMAIL` — recipient (default `luismedlozn@gmail.com`; will become `hola@vuelveclub.com`).
- `LEAD_FROM_EMAIL` — sender (default `onboarding@resend.dev` until `vuelveclub.com` is verified in Resend).

There is no lint or test tooling; verify visually in the browser and by submitting the forms under `vercel dev`.

## Architecture

Three top-level files, loaded in this order — `VuelveClub.html` links `styles.css` then `app.js` at the end of `<body>`:

- **[VuelveClub.html](VuelveClub.html)** — all markup. One `.shell > .card` wrapper containing sections in fixed order: header, hero (`#`), comparación, métricas, features, precio, demo, footer. Inline SVGs are used for all icons. Section anchors (`#demo`, `#features`, etc.) are the nav targets.
- **[styles.css](styles.css)** — all styling. Design tokens live in `:root` (CSS custom properties): the cream/ink/lime/plum palette, radii, the three font families (Fredoka display, Hanken Grotesk body, DM Mono labels), and shadows. Change colors and spacing through these variables rather than hardcoding.
- **[app.js](app.js)** — all behavior, wrapped in one IIFE. Adds `.js` to `<html>` on load (CSS keys progressive enhancement off this).

### How app.js works (the non-obvious parts)

- The phone mockup renders a **simulated Wallet loyalty card** entirely from JS. The `BIZ` array (café / barbería / pizzería) is the source of truth: each entry's colors, icon key, and reward drive both `renderCard()` (innerHTML string templating into `#wallet`) and the confetti palette. Icons are SVG path strings in the `ICONS` map. To add/restyle a demo business, edit `BIZ`.
- An animation loop (`runFill` → `showWon` → `nextBiz`) auto-fills 10 stamps, celebrates, then cycles to the next business. All timers go through `later()`/`clearTimers()` so they can be cancelled — use these rather than raw `setTimeout` to keep the loop interruptible. The dots in `#bizDots` let users jump (`jumpTo`).
- Scroll/visibility effects are all `IntersectionObserver`-based and self-wire from the DOM: `[data-to]` → count-up stats, `.stat[data-viz]` → adds `.animate`, `.reveal` → adds `.in`. Add the matching class/attribute in HTML to opt an element in; no JS changes needed.
- `[data-magnetic]` buttons follow the cursor on hover.
- **Lead forms** (`form[data-demo]`) submit via `fetch` to `/api/lead`. Each form declares its origin with `data-source` (`"hero"` | `"demo"`); the handler reads named inputs, shows loading/success/error states, and surfaces a `.form-error` element on failure (leads are never silently dropped). Each form has a hidden `.hp` honeypot input named `company`. To add a field, give the input a `name`, then read it in both the handler payload and `api/lead.js`.

### Backend: api/lead.js

Vercel Node serverless function (ESM — `package.json` has `"type": "module"`). Validates input, drops honeypot hits silently (200, no email), and emails the lead via Resend. Returns `{ ok: true }` / `{ ok: false, error }`. No database — leads exist only as email; persistence/autoresponder are deliberately out of scope (see the design spec). Holds no secrets; all config via the env vars above.
- Easter egg: typing `vuelve` anywhere instantly fills the card (`fillAll`).

## Assets

- `assets/` — production images referenced by the site (characters, logo mark).
- `screenshots/` and `uploads/` — scratch/reference images, **not used by the site**. Don't reference them from HTML.
