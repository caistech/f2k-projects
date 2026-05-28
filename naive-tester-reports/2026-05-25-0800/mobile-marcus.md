# Mobile Marcus — Seafields Estate, phone walkthrough

**URL:** https://f2k-projects.vercel.app/seafields-estate
**Device:** iPhone-class, 375×812, on the couch, dodgy wifi
**What I was after:** saw a "land from $155,000" ad, wanted to see what's for sale, look at the map and the house designs, find a lot + price, and register interest — all with my thumbs.

**Verdict up front:** Yes, I'd actually finish a registration on my phone — but only because the lot pop-up and the form are genuinely good. Getting *to* a lot is the rough part: the lots on the map are pinhead-sized, the page jumps around as it loads, and there's a doubled-up disclaimer banner stealing the top of my screen. The form itself is the best thing on the page.

---

## Hero / top of page

Looks the part. Big "Seafields Estate", "145 residential lots — vacant land or house & land packages", location, and a fat teal "Select your lot →" button I can hit easily. Text is a comfortable size, no squinting. Tab says "Seafields Estate — Register Your Interest | F2K", so I know what I'm on.

**Bug — doubled disclaimer banner.** There are TWO identical "REGISTRATION OF INTEREST ONLY — No deposit is required or accepted…" bars stacked on top of each other: one above the F2K logo bar, one right below it (confirmed in the DOM — banner text nodes at y=10 and y=152). On a phone that's ~120px of my screen gone to the same sentence twice before I see anything. Screenshots `02-hero-top.png` and `03-menu-open.png` show it plainly.

**Sticky chrome is heavy.** The top banner + the nav both stay pinned as I scroll, so the top ~25% of the screen is permanently chrome. Combined with the doubled banner it's a lot of dead space on a small screen.

## Hamburger menu

Works great. Tap the hamburger, a clean drawer slides in — Projects / Seafields / Branscombe / Hemp Homes / About F2K — well-spaced rows, easy thumb targets, big X to close. No complaints. (`03-menu-open.png`)

## Stats + About

Stats reflow into a tidy 2-up grid: 145 LOTS · 445–1522m² · From $155k land · From $485k H&L · From Q3 2026. The "$155k" matches the ad, good. The About text reads well — proper paragraph size, sensible line length, the Geraldton Health Campus angle is clear. (`04-about-stats.png`, `05-about.png`)

**Niggle — section titles hide under the sticky bar.** When I tap into the page mid-way, the section heading ("About the Development") lands *behind* the pinned banner+nav, so I see the body before the title. The fixed chrome doesn't leave an anchor offset.

## Staging cards + "Two Ways to Buy"

The stage cards are the nicest mobile bit after the form — a clean 2-column grid of cards: Stage 1 OPEN (20), Stage 2 RESERVED (1, "Heritage — retained, Not for sale"), Stage 3 OPEN (23), Stages 4/5/6/7 LOCKED. Status is obvious at a glance, cards are big tap-friendly blocks. (`07-staging-twoways.png`)

"Two Ways to Buy" stacks two clear cards — Vacant Serviced Land (from $155k) and House & Land Package (from $485k). Fine. (`08-twoways.png`)

**Copy confusion (not a bug, just me as a buyer):** the heading says "Stages 1–3 Open Now — 43 Lots", then the cards say Stage 1 (20) + Stage 3 (23) open and Stage 2 is "retained, not for sale". I had to do the arithmetic (20+23=43, skipping Stage 2) to trust it. A half-second of "wait, what about Stage 2?".

## The lot map — this is where it gets hard

The map is the centrepiece and the weakest part on a phone.

**Bug — lot tap targets are tiny.** I measured the actual tappable lot shapes on the plan: **18×8, 18×7, 8×18, 19×17, 12×16, 11×19px**. The rule of thumb (literally) is 44×44px. These are a quarter of that. With my thumbs I'd be fat-fingering neighbouring lots constantly, or zooming in and hunting. On the couch this is the difference between "I'll just tap my lot" and "ugh, forget it." (measured via DOM; the rendered map is `14-map-svg.png`.)

**The map is a tiny vector site plan.** At 375px the whole subdivision is crammed into one small panel — lots are little rectangles, the lot numbers on the drawing are sub-12px and I can't read them without pinch-zooming. Classic "tiny map" problem.

**Bug — VIEW toggle row overflows its box.** The Plan view / Satellite / Schematic grid / **Official drawing** toggle group is 262px of buttons stuffed in a 191px container (`rowOverflow:true`). The 4th option ("Official drawing") is clipped off the right edge — I never see it unless I scroll that little strip sideways, which isn't obvious it's scrollable. I only knew it existed because the accessibility tree listed it. (`12-map-view.png`, `13-map-lots.png` — only 3 toggles ever visible.)

**Bug — the page rubber-bands while loading.** The map and floor-plan images lazy-load and the document height kept oscillating violently as I scrolled (I watched scroll positions for the same element jump between ~1,500, ~8,000 and ~10,900 across loads; the browser tab actually *crashed* twice on me mid-scroll). On a real phone with limited memory this is jank — the content you're reaching for slides out from under your thumb, and a couple of times the whole thing reloaded. Worth profiling; a heavy SVG + many floor-plan images on one route is rough on mobile RAM.

**Default "10 lots match — 135 dimmed" is a let-down.** With "Available only" + "Only lots with disclosed pricing match" on by default, 135 of 145 lots are greyed out the moment I land. I came in off a "$155k" ad expecting to browse lots, and most of the map is dimmed. Not wrong, but deflating.

### The lot pop-up — finally, the good part

Tapping a lot opens a proper modal and it's genuinely good (`16-lot307-tap.png`): "Lot 307 · Central · 536 m² · Standard · Available · HOUSE + LAND From $155,000 · LAND ONLY From $155,000", the indicative-figures disclaimer, a big "Add to my registration" button, and a clear X. Full-width, big text, big CTA — exactly right for a phone. This rescues the map experience once you manage to land a tap.

**Inconsistency — modal says "$155,000", form summary says "No price set".** The pop-up shows "From $155,000", but down in the form the Selected Lots summary lists "Lot 307 … No price set" (`21-form-lower.png`). Same lot, two different price stories on the same page. As a buyer that makes me distrust the number.

**Minor — I ended up with two lots I didn't deliberately pick.** The form summary had Lot 307 *and* Lot 310. Multi-select is a feature, but it's easy to accidentally add a second lot (tiny targets + earlier taps) and not notice until the summary.

## Home designs

Stacks single-column, clear "Modular Homes Built to Plan" header and explanation, big 341×256px "Expand floor plan" buttons (easy to hit). The floor-plan drawings themselves have sub-12px dimension labels — fine for an architectural plan, but I'm pinch-zooming to read anything on them. (`26-home-designs.png`)

## The registration form — best thing on the page

Once a lot's selected, the form unlocks (`19-form.png`–`22-form-submit.png`):

- Good explanatory header: "Register Your Interest — Complete the form below… No deposit or commitment is required."
- First/Last name, Email, Phone, plus When-looking-to-buy / Finance status / How-did-you-hear dropdowns, an optional referrer section, and Notes. All full-width, big inputs, labels that don't truncate. Native `fill` confirmed they take input cleanly.
- **Selected Lots** summary is right there so I know what I'm registering for.
- **Consequence clarity is excellent (§9):** a consent checkbox spelling out "Registration of Interest only — no deposit or commitment… pricing indicative… subject to confirmation… final figures confirmed in writing prior to any contract", a Privacy Policy link, and the submit button is *disabled until you tick it* with a helpful "One more step — tick the consent checkbox above to enable the submit button." Nobody submits this by accident, and nobody's confused about what they're agreeing to.
- I filled it (Marcus Testerton, fake email/phone, Geraldton 6530), ticked consent, hit "Register My Interest" — button went to "Submitting…" (`23-confirmation.png`), so the flow is wired and gives in-flight feedback. The headless browser kept resetting on me before I could screenshot the final thank-you, but the submit path is functional end-to-end.

**Bug — no address autocomplete.** Suburb and Postcode are plain text fields (`#sf-suburb`, `#sf-postcode`). On a phone, typing a suburb + postcode by hand is exactly the friction the portfolio's own "address fields → autocomplete" rule exists to kill. Give me a Mapbox-style suburb picker.

---

## Would I complete this on my phone?

**Yes — but the map nearly loses me first.** The form is so clean and reassuring that once I have a lot in my selection I'd happily finish. The risk is the 30 seconds before that: doubled banner eating my screen, a tiny map with pinhead lots, the page jumping/reloading as it loads, and a "135 dimmed" map that feels empty. If I were a slightly less patient version of me, I'd have bailed at "I can't tap my lot" and emailed Uwe instead.

## Top fixes, in the order they'd save the sale

1. **Make lots tappable** — the 8–19px lot shapes need a ≥44px hit area (invisible padding on the SVG hit-region), or add a tap-to-zoom, or a plain scrollable **list of lots** as a thumb-friendly alternative to the map. This is the #1 mobile blocker.
2. **Kill the duplicate disclaimer banner** — one is plenty; reclaim ~60px at the top.
3. **Fix the page rubber-banding / crashes** — lazy-load is thrashing layout and crashing the tab on mobile. Reserve image heights / virtualise the floor plans.
4. **Fix the VIEW toggle overflow** — "Official drawing" is clipped off-screen; let the 4 toggles wrap or shrink to fit 375px.
5. **Reconcile the price** — "From $155,000" in the modal vs "No price set" in the form summary; pick one.
6. **Address autocomplete** on suburb/postcode.
7. **Anchor offset** so section titles aren't hidden under the sticky chrome when you jump mid-page.

**Opportunity:** a sticky "X lots selected — Register →" pill on mobile once you've added a lot would let me jump straight to the form instead of scrolling the whole long page back down past the dimmed map.

**Opportunity:** default the map to *show* all lots (not 135 dimmed) for first-time visitors off a price ad — let me feel the inventory before you filter it down.

---

## Standards Check (375px, I'm the authority on §1)

- **§1 Responsive — ❌ FAIL.** Page-level: no horizontal scroll (docScrollW=375), body text 16px, nav collapses to a clean drawer, cards/grids reflow — all good. BUT: map lot tap targets are 8–19px (need 44px); the VIEW toggle row overflows its container (262px in 191px, clips "Official drawing"); the page rubber-bands and the tab crashed twice on mobile. The map is not usable by thumb. That's a fail on the part that matters most for the goal.
- **§5 Explanatory header — ✅ PASS.** Map ("Click a lot on the subdivision plan to select it…"), home designs, and the registration form all open with clear what/how/why headers.
- **§6 Voice agent — —.** None present (no ElevenLabs/convai in the DOM). Reasonable to omit on a public property listing; flagging as N/A, not a fail.
- **§7 Scaffold metadata — ✅ PASS.** Tab title "Seafields Estate — Register Your Interest | F2K" — real product name, not "Create Next App".
- **§9 Codicils — 🟡 MIXED.** Consequence-before-click is exemplary (consent checkbox gates submit, explicit "Registration of Interest only", in-flight "Submitting…"). Next action is mostly obvious (the "One more step" hint is great). BUT: no address autocomplete on suburb/postcode (fail vs the address-autocomplete codicil), and the modal-vs-form price mismatch ("$155,000" vs "No price set") is a trust dead-end.

Marcus
