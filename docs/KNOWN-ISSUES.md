# Known issues

## Mobile horizontal clipping at narrow viewports (≲400px) — resolved

**Update (2026-10-22):** The hero is responsive, and metrics now use one column at
≤680px. The mobile rule explicitly targets `.metrics-layout .stats`; the older
`.stats` selector lost to that more specific desktop rule. Grid tracks use
`minmax(0, 1fr)` and cards have `min-width: 0`. Browser checks at 320, 360, 390,
700, 768, 1024, 1280 and 1440px found no viewport overflow in page content.

**Symptom (original):** On real phone widths around 360px, the right edge of hero content
(`.hero-copy`, `h1`, `.sub`, the form) and the metrics `.stats` grid are clipped.
It is not a document-level scroll (`.card` has `overflow: clip`, so
`document.scrollWidth` stays == viewport), which is why it's easy to miss — the
overflow is silently cut off rather than producing a scrollbar.

**Measured (true 360px viewport via Chrome DevTools emulation):** ~38 elements
have `getBoundingClientRect().right` of 400–412px against a 360px viewport, i.e.
they overflow by ~40–52px and get clipped.

**Likely root cause:** CSS grid items default to `min-width: auto`, so a track
won't shrink below its content's min-size. The hero's right column contains the
fixed-width phone (`.phone { width: 310px }`); with `--pad-x: 22px` (mobile) plus
`.shell` padding, the available content width at 360px is < 310px, so the grid
track expands past the viewport and the whole hero row stretches with it. The
`.stats` grid overflows similarly.

**Applied fixes:** Hero grid children can shrink, the phone has `max-width: 100%`,
and the metrics grid now applies the correct mobile selector and track sizing.

**Verification note / gotcha:** headless Chrome on Windows clamps the minimum
window width to ~476px, so `--window-size=360 --screenshot` renders at ~476px but
crops the PNG to 360px — producing *fake* clipping that looks like this bug but
isn't. To test mobile for real, use CDP `Emulation.setDeviceMetricsOverride`
(see the throwaway probe used during diagnosis), not `--window-size`.
