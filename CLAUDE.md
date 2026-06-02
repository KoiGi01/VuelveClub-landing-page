# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page marketing landing site for **VuelveClub**, a digital loyalty-card product (NFC stamp + Apple/Google Wallet) sold to Mexican small businesses. Copy is in Mexican Spanish (`lang="es-MX"`). This is a static site — no build step, no package manager, no tests, no backend.

## Running / developing

Open [VuelveClub.html](VuelveClub.html) directly in a browser, or serve the folder over HTTP (needed so relative asset paths and the `IntersectionObserver`-driven animations behave like production):

```powershell
python -m http.server 8000   # then open http://localhost:8000/VuelveClub.html
```

There is no lint, build, or test tooling. Verify changes visually in the browser.

## Architecture

Three top-level files, loaded in this order — `VuelveClub.html` links `styles.css` then `app.js` at the end of `<body>`:

- **[VuelveClub.html](VuelveClub.html)** — all markup. One `.shell > .card` wrapper containing sections in fixed order: header, hero (`#`), comparación, métricas, features, precio, demo, footer. Inline SVGs are used for all icons. Section anchors (`#demo`, `#features`, etc.) are the nav targets.
- **[styles.css](styles.css)** — all styling. Design tokens live in `:root` (CSS custom properties): the cream/ink/lime/plum palette, radii, the three font families (Fredoka display, Hanken Grotesk body, DM Mono labels), and shadows. Change colors and spacing through these variables rather than hardcoding.
- **[app.js](app.js)** — all behavior, wrapped in one IIFE. Adds `.js` to `<html>` on load (CSS keys progressive enhancement off this).

### How app.js works (the non-obvious parts)

- The phone mockup renders a **simulated Wallet loyalty card** entirely from JS. The `BIZ` array (café / barbería / pizzería) is the source of truth: each entry's colors, icon key, and reward drive both `renderCard()` (innerHTML string templating into `#wallet`) and the confetti palette. Icons are SVG path strings in the `ICONS` map. To add/restyle a demo business, edit `BIZ`.
- An animation loop (`runFill` → `showWon` → `nextBiz`) auto-fills 10 stamps, celebrates, then cycles to the next business. All timers go through `later()`/`clearTimers()` so they can be cancelled — use these rather than raw `setTimeout` to keep the loop interruptible. The dots in `#bizDots` let users jump (`jumpTo`).
- Scroll/visibility effects are all `IntersectionObserver`-based and self-wire from the DOM: `[data-to]` → count-up stats, `.stat[data-viz]` → adds `.animate`, `.reveal` → adds `.in`. Add the matching class/attribute in HTML to opt an element in; no JS changes needed.
- `[data-magnetic]` buttons follow the cursor on hover. `form[data-demo]` submits are intercepted (`preventDefault`) and only show a fake confirmation — **forms are not wired to any backend.**
- Easter egg: typing `vuelve` anywhere instantly fills the card (`fillAll`).

## Assets

- `assets/` — production images referenced by the site (characters, logo mark).
- `screenshots/` and `uploads/` — scratch/reference images, **not used by the site**. Don't reference them from HTML.
