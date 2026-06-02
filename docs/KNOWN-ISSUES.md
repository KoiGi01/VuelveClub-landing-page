# Known issues

## Mobile horizontal clipping at narrow viewports (≲400px) — open

**Symptom:** On real phone widths around 360px, the right edge of hero content
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

**Likely fix (not yet applied):**
- Add `min-width: 0` to the hero grid children (`.hero-copy`, `.hero-visual`) so
  the columns can shrink.
- Make the phone responsive on small screens (e.g. `.phone { width: min(310px, 100%) }`
  or scale it down in the ≤680px media query).
- Re-check the `.stats` grid min-track sizing at ≤680px.

**Verification note / gotcha:** headless Chrome on Windows clamps the minimum
window width to ~476px, so `--window-size=360 --screenshot` renders at ~476px but
crops the PNG to 360px — producing *fake* clipping that looks like this bug but
isn't. To test mobile for real, use CDP `Emulation.setDeviceMetricsOverride`
(see the throwaway probe used during diagnosis), not `--window-size`.
