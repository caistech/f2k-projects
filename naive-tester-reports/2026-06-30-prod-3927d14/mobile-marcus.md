# Naive-Tester Report — Mobile Marcus

Hi Dennis,

- **Persona:** Mobile Marcus (phone only, fat thumbs, flaky network, pinch-zooms to read, reports anything <16px or <44px)
- **URL:** https://f2k-projects.vercel.app (LIVE prod, commit 3927d14)
- **Goal:** Browse the estates and register interest in a home — all one-thumb on a phone
- **Viewport:** 390x844 throughout, key pages re-checked at 375px
- **Duration:** ~40 min equivalent

**Verdict up front:** the core journey works one-thumb — I found Seafields, tapped a lot, the lot rode through into a full-width form, and the form genuinely submitted (real 200, real "Registration Received" card, no fake success). But the interactive lot map is a thumb-fight, lots of body/label text is under 16px so I'm pinch-zooming, and a floating "Report a problem" pill sits on top of important buttons on nearly every screen.

---

## Landing page (`/`)

- Loads clean, no horizontal scroll at 390 OR 375. Tab title reads "Factory2Key Projects — Australian Housing Developments" — proper product name, not "Create Next App". Good.
- The dark sticky banner ("REGISTRATION OF INTEREST ONLY…") and the explanatory header ("Tap a state to see what we're building…") tell me what this is straight away. I like that.
- Hamburger top-right is a proper 44x44 target, opens a clean drawer with a State → Estate hierarchy (WA › Seafields, SA › Dutton Terrace, TAS › Branscombe, Multi-state › Hemp Homes). The drawer links are 44-48px tall at 16px — these are the most thumb-friendly things on the whole site. Whoever built the menu got it right.
- **The eyebrow labels are too small to read.** "OUR CURRENT DEVELOPMENTS" is 10.4px and the card category labels ("WA · RESIDENTIAL SUBDIVISION", "SA · MASTER-PLANNED COMMUNITY") are **9.6px**. I literally pinch-zoomed to read them. Anything under ~12px on a phone is a squint.
- **Card body text is 14px** (location, descriptions, the "Select your lot →" link). It's legible but it's under your own 16px floor, and on a phone it feels cramped.
- On first paint the estate card images were blank grey boxes and only filled in a second later (lazy-loaded). On my flaky connection the page looked half-broken for a beat before the photos arrived. Not fatal, just an "is this loading?" moment.
- **Opportunity:** bump the eyebrow labels and card body to ≥16px (or at least the labels off 9.6px), and give the lazy images a light placeholder/skeleton so a slow connection doesn't show empty grey rectangles.

## The floating "Report a problem — get it SayFixed" pill (every page)

- This black pill is pinned to the bottom-left and rides on top of the content on *every single screen* I visited. It's ~314x42, just under a 44px tall thumb target itself.
- It overlapped the hero intro paragraph on the landing page, sat over the bottom row of stage filters on the Seafields map, and — worst — **covered the "Add to my registration" button on the lot detail sheet and the estate CTAs.** With fat thumbs reaching for the primary action, I'm hitting "Report a problem" instead.
- **Opportunity:** this is an internal/admin tool surfaced to public buyers. Either hide it on public pages, move it clear of bottom CTAs, or shrink/auto-collapse it on mobile so it never overlaps an action button.

## Seafields Estate (`/seafields-estate`)

- Hero is strong: "Seafields Estate", a clear what/why explainer ("Select your preferred lot… no deposit, no commitment"), and a big teal "Select your lot →" button. No overflow at 390 or 375. Tab title is a real product title.
- Tapping "Select your lot" smooth-scrolls down to the site map. Good — obvious next step.
- **The interactive lot map is a thumb-fight.** The whole 145-lot subdivision is squeezed into ~390px wide, so the lot numbers (377, 378…) are microscopic — I can't read a single one without pinch-zooming hard. I measured the individual lot tap targets at **~19px wide by 9px tall**. There is no way I'm tapping the lot I want one-thumb at the default zoom; I have to pinch-zoom and pan first. There are +/- and fullscreen controls (those are fine, ~44px), so it's *possible*, just fiddly.
- The filter controls above the map are all undersized: the Plan/Satellite/Schematic/Drawing view toggles are **28px** tall, the Type/Size/Price dropdowns **30px**, and the Stage filter chips **32px**. All under 44px — my thumb skids between them. (The Stage chips do reflow into wrapping rows on mobile, which is the right call, they're just short.)
- **Opportunity:** on a coarse-pointer device, auto-zoom the map to a tappable default (or default to a stage so fewer lots show), and lift the filter controls + view toggles to ≥44px tall. The map is the heart of this product and right now it's the least phone-friendly part of it.

### Selecting a lot → the detail sheet

- I tapped an available (teal) lot (Lot 238). It opened as a **full-screen sheet** — exactly the right mobile modal pattern, no desktop dialog overflowing the viewport. Showed size, category, zone, status, two pricing options, dwelling config, and the indicative-pricing disclaimer.
- **Data oddity:** both pricing options read **$933,400** — "House + Land Package" *and* "Serviced Land Only" are the same number. Land-only costing the same as land-plus-a-house looks wrong to a buyer (it certainly did to me). Worth a check.
- The "Add to my registration" button at the bottom of the sheet was **partly covered by the SayFix pill** again.

## Registration form

- Adding the lot dropped me straight into the registration form with **Lot 238 shown as a "1st preference" chip** — nice, the selection carried through and I could see it stuck.
- Form is full-width on mobile, labels above fields, single column — all correct. Rich set of fields: contact details, purchase type (Vacant land / House & land), primary/secondary dwelling, "I am a…", situation, timeframe, finance, "How did you hear about us? *", "Were you referred by anyone? *", notes, and a required consent checkbox.
- **Good gate:** the "Register My Interest" button stays **disabled** until the required fields + consent are filled, so I can't fire an empty submit. When enabled it's 48px tall and full-width — the one big, comfortable tap target in the flow.
- **Inputs are 42px tall at 14px font.** Two nitpicks: 42px is a hair under 44, and 14px text means **iOS will zoom the page in when I focus a field** (anything under 16px triggers it). On a phone that zoom-jump is jarring mid-form.
- There's a hidden honeypot named `hp_field` (autofill-neutral) — good, that's the safe pattern, no false-positive lead-dropping.
- **Opportunity:** push input font to 16px to kill the iOS focus-zoom, and nudge input height to 44px.

### Submitting (what actually happened)

- I filled the form and submitted. The request hit `POST /api/seafields/register` and came back **200 with a real "Registration Received" card** (green check, "We've recorded your interest in 1 lot", a confirmation-email line). **This is a real submission, not a fake client-side success screen** — the §9 trap is not present here. 
- **But it took 11.3 seconds to respond.** On my intermittent connection, 11 seconds of nothing made me think it had failed and I nearly re-tapped. I didn't see an obvious "Submitting…" spinner/disabled-state on the button during the wait.
- **Opportunity:** show an immediate "Submitting…" state on the button (disable + spinner) the instant it's tapped, and ideally trim that 11s server round-trip — that's long enough on mobile to lose people to a double-submit or a back-button.
- After success the page scrolls down to the footer rather than keeping the confirmation card in view — I had to scroll back up to find the "Registration Received" message. Minor, but the success should stay on screen.

*(Honesty note on a thing I saw: the confirmation card displayed a different email than the one I typed. I traced this to the automated browser retaining a prior test session's form state — the submit pipeline itself is verified working, but a human should do the final keyed submit to confirm the typed email is what lands. Calling it out so it's not mistaken for a clean pass or a confirmed bug.)*

## Branscombe Estate (`/branscombe-estate`)

- Checked at 375px. Same clean hero pattern, explanatory header, no horizontal overflow. Consistent with Seafields — good. (CTA again partly under the SayFix pill.)

## Dutton Terrace & Developers

- Landing card "Register interest →" for Dutton links correctly to `/dutton-terrace-estate` (my own guess of `/dutton-terrace` 404'd — that's on me, the site's link is right).
- Both `/dutton-terrace-estate` and `/developers` loaded slowly and `/developers` repeatedly crashed my headless mobile browser. That matches a known heavy-page behaviour in this harness rather than a guaranteed real-device fault, so I'm flagging it as **inconclusive** — worth a real-phone check that `/developers` (the heavy onboarding page) renders without choking a mobile browser.

## Voice agent (§6)

- **No voice surface on the public landing page or the Seafields estate page** (no convai launcher/element, no ElevenLabs script). These are the pages a buyer actually uses to register, and there's no reachable voice helper there. I couldn't confirm the `/developers` voice agent because that page crashed the browser this session.
- **Opportunity:** if voice (Morgan) is meant to help buyers through the nuanced register-interest form, it isn't reachable from the buyer-facing chrome right now.

## Auth / blocked surfaces

- I never hit a login gate on the buyer journey — registering interest needs no account, which is correct for this product. **No surfaces were blocked by missing credentials.** I did not attempt any `/admin` area (no credentials, and out of scope for a buyer persona).

---

## Standards Check

- §1 Responsive — no horizontal scroll: ✅ landing/Seafields/Branscombe all clean at 390 and 375, no element wider than viewport, map container doesn't overflow.
- §1 Touch targets ≥44px: ❌ map filter toggles 28px, dropdowns 30px, stage chips 32px, individual lots ~19x9px, text inputs 42px. (Hamburger 44px and menu links 44-48px pass.)
- §1 Body text ≥16px on mobile: ❌ card/body text 14px; eyebrow labels 9.6-10.4px; form inputs 14px.
- §1 Nav collapses to thumb-reachable mobile pattern: ✅ hamburger → drawer with full State→Estate hierarchy, 44px+ items.
- §5 Explanatory header (what/do/why): ✅ present on landing and every estate hero.
- §6 Voice agent reachable from chrome: ❌ none on public landing or Seafields estate page; `/developers` unconfirmed (page crashed).
- §7 Tab title is product name: ✅ "Factory2Key Projects — …" and per-estate titles, not "Create Next App".
- §9 Form full-width + submit reachable: ✅ full-width single-column, 48px submit, disabled-until-valid gate.
- §9 Form actually submits (no fake success): ✅ real `POST /api/seafields/register` → 200 + genuine "Registration Received" card + confirmation email (but 11.3s, no visible submitting state).
- §9 Next action always obvious / zero dead ends: ✅ landing → estate → select lot → form → confirmation all flow; minor ding that success scrolls to footer instead of staying on the confirmation.

## Scope note

Buyer journey on mobile only (390x844, re-checked 375px), via the headless `/browse` harness emulating an iPhone. No real device, no admin/auth areas, no credentials used or requested. The map tap-target and text-size measurements are computed from the live DOM. The submit pipeline is verified by a real 200 + confirmation card; the typed-email-on-confirmation point is a harness artifact, not a confirmed product bug. `/developers` and `/dutton-terrace-estate` load/voice checks are inconclusive due to the headless browser choking on those heavier pages.

Thanks,
Marcus
