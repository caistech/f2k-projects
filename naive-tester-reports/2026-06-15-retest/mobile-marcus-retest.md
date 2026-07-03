VERDICT: FAIL — the MAP blocker is NOT fixed. At 375px there are still no zoom controls, no pinch/double-tap zoom, no pan, and the 145 lots render at ~7–17px so I can't tap one to open its detail. (The TEXT blocker IS fixed.)

# Mobile Marcus — Seafields Estate RE-TEST
URL: https://f2k-projects.vercel.app/seafields-estate
Viewport: 375 × 812 (iPhone SE). Retest date: 2026-06-15.

It's Marcus. You asked me back to confirm two things you'd previously red-flagged got fixed. One of them did. The big one didn't. Here's what my thumb found.

## ❌ REMAINING BLOCKERS (read these first)

### ❌ BLOCKER 1 — THE MAP. Still un-tappable, still no zoom. Nothing changed that I can feel.
You told me to expect pinch-zoom + double-tap-zoom + pan + visible +/−/reset buttons top-right. I went looking. None of it is there.

What I measured on the live page (375px):
- **Zoom buttons: ZERO.** The whole page has only **7 buttons total** — one hamburger and six "Expand [Joey/Koala/3x2/4x2/EMU/BigRoo] floor plan" buttons. There is no +, no −, no reset, nothing labelled zoom/fit/scale anywhere in the DOM. I searched by text, aria-label, title, class and data-action. Empty.
- **No zoom/pan engine.** No `react-zoom-pan-pinch` wrapper (count 0), no Leaflet container (0). The map SVG and its parents all compute `touch-action: auto` — not `pinch-zoom`, not `none`. There's no `<g transform>` that a zoom would drive. So pinch and double-tap have nothing wired to them.
- **No "drag/pinch/zoom" hint text** anywhere on the page either.
- **The lots are still tiny.** The lot map is a single SVG, 317×214px, holding 147 lot paths. Measured lot sizes: a run of **17×7, 17×8 px**, and the smallest real lots are **7px** on a side. That's the same ~15px median you flagged last time.
- **I tried to tap a lot.** I aimed at the centre of a real lot (7×17px) and clicked. The hit landed on an overlay `<a>`, NOT the lot path (`hitIsLotPath: false`), and **no detail modal opened** (`modalsBefore: 0, modalsAfter: 0`). So: can I zoom in and then tap an individual lot to open its detail modal? No on both counts — there's nothing to zoom with, and a raw tap on a lot doesn't open anything.

I also confirmed there's only ONE map on the whole page — the same 147-path SVG is the only thing with more than 20 shapes, whether I look at the hero or scroll down to the "Select Your Preferred Lot(s)" section (heading sits ~10,680px down). So the picker reuses this same un-zoomable overview. See `06-lotmap.png` — that's the map, with a Stages legend under it and not a single zoom control in sight.

My honest reaction as a phone user: this is a pretty coloured picture of the estate, but I cannot pick my lot on it. My finger covers six lots at once and tapping does nothing. Same wall I hit last time.

## ✅ WHAT GOT FIXED

### ✅ TEXT SIZE — genuinely fixed. Nothing tiny left.
This one you nailed.
- I swept **every rendered text element on the page** for anything under 12px. Result: **zero**. Nothing is below 12px anymore.
- **Eyebrow labels** that were 8.8–10.4px last time — e.g. "A FACTORY2KEY DEVELOPMENT", "ABOUT THE DEVELOPMENT" — now compute to **16px**, even though they still carry the `text-xs` class. Looks like there's a mobile font floor pushing everything up to 16px at small widths. Whatever it is, it works.
- **Body paragraphs**: every `<p>` I sampled is **16px** (the lead "145 residential lots…", the location line, the "Select your preferred lot…" blurb, the about-development copy). All ≥16px. Good.
- **Home-design card tags/specs** (the shared component — Joey/Koala/3x2/4x2/EMU/BigRoo): the spans/labels I sampled in that family also compute to **16px**. The page-wide "nothing under 12px" sweep covers these too, so the shared component is clean now.

Readable everywhere. See `06-lotmap.png` / `07-picker.png` — the headings and body copy are big and clear.

## OTHER CHECKS

- ✅ **No horizontal scroll** at 375px (scrollWidth == clientWidth == 375).
- ✅ **Hamburger menu** is 44×44px — a proper thumb target.
- ✅ **Floor-plan expand buttons** are 341×256px — easy to hit.
- ✅ **No console errors** on load.
- ⚠️ **Note on method / daemon flakiness:** this heavy map page repeatedly crashed/reset the headless browser (a constrained-daemon artifact, as warned — concurrent sessions were also churning the daemon). I warm-chained and retried throughout. The map findings above are confirmed across MULTIPLE independent healthy reads (consistent 147-path SVG, 17×7px lots, 0 zoom controls, 0 pan-zoom wrapper, touch-action:auto every time), so I'm confident they're real and not a render glitch. There was also a transient scroll-lock right after fresh navigation (window stayed at scrollY 0) that the native scroll command released — that's a daemon timing thing, not a site bug.

## SCREENSHOTS (./naive-tester-reports/2026-06-15-retest/mobile-marcus-retest/)
- `06-lotmap.png` — the lot map in view: coloured stages, Stages legend, and NO zoom controls anywhere. This is the evidence for Blocker 1.
- `01`–`05`, `07` — hero + scroll states; text rendering clearly ≥16px throughout (evidence the text fix landed).
- I could not capture a "zoomed-in map" or a "lot detail modal" screenshot for the simple reason that neither exists — there's no zoom and a lot tap opens nothing.

## BOTTOM LINE
Text: sorted, ship it. Map: still the same blocker — 145 lots at ~7–17px, no zoom, no pan, no zoom buttons, and a tap on a lot opens no detail. Until I can zoom in and actually tap my lot, I can't do the one thing this page exists for. This is a FAIL on the map.

— Marcus
