# Mobile Marcus — Seafields Estate (mobile, 375px) walkthrough

VERDICT: FAIL — two blocking ❌:
1. **Map lots are un-tappable with a thumb.** 146 of 147 lot polygons are under 44px in at least one dimension; the median lot is 15×13px (a typical lot is ~17×7px). There is NO map zoom/pinch control (touch-action: auto). On a phone this is the primary task and it's effectively a lottery — I hit the wrong lot or nothing.
2. **Text below the readability floor.** "Eyebrow" section labels render at 8.8px and 10.4px (under the hard <12px line), and 16 of 29 body paragraphs (descriptions, specs, legal) sit at 12–14px, under the 16px mobile base. The hero copy is fine; a lot of the secondary content is not.

Everything else is genuinely good: clean responsive shell, 44px hamburger, no horizontal scroll, a nice full-screen lot modal, a clear legend, and a real registration form behind a sensible "pick a lot first" gate.

---

URL: https://f2k-projects.vercel.app/seafields-estate
Viewport: 375 × 812 (iPhone-class)
Persona: Mobile Marcus — phone only, fat thumbs, flaky network, reports anything <16px as "can't read this"

---

## First impression (landing)
Opened it on my phone and honestly it looks sharp. Big "Seafields Estate" headline, a one-line "145 residential lots — vacant land or house & land packages," location, and a clear teal **Select your lot →** button right there in the first screen. There's a sticky "REGISTRATION OF INTEREST ONLY — no deposit" banner up top so I knew straight away I wasn't signing my life away. Logo top-left, hamburger top-right — I could reach it with my thumb, and it's a proper 44×44 button (measured). Tapped it: clean drawer slides over with "Seafields Blog & Gallery" and "About F2K", and an X to close. No complaints about the nav.

No sideways scroll anywhere on the page (checked: scrollWidth = innerWidth = 375 the whole way down). That alone puts it ahead of half the sites I try on my phone.

There's also a persistent "Report a problem — get it SayFixed" pill at the bottom, which is fine, though it overlaps the very bottom of the screen on some sections.

## Scrolling down — the content
Lots of good info: an "About the Development" block, a stats strip (145 lots / lot sizes / from $155k / H&L from $485k / Stage 1 Q3 2026), a staging breakdown (Stage 1 OPEN 20 lots, Stage 3 OPEN 24, etc.), "Two Ways to Buy," a Geraldton market strip ($533K median, 27% growth), and a big home-designs gallery (Joey, Koala, 3x2, 4x2, EMU, BigRoo) with prices and "View plan →" links.

The home-designs gallery scrolls as a normal vertical stack — no awkward horizontal carousel to fight, which I appreciate on a phone. BUT the little spec lines under each home ("2 bed · 1 bath · ≈100m² overall") are 12px, and the category tags above them ("ANCILLARY / DOWNSIZER") are **8.8px**. I had to pinch-zoom the page to read those. That's the "I can't read this" reflex.

The page is also **heavy** — it visibly shifts as images lazy-load, and the total height changed between reloads (the map anchor landed at ~10,000px one load and the page only measured ~8,500px tall another). On my patchy connection that means I tapped where I thought the map was and the layout had moved. Mild motion-sickness, and a real risk of mis-taps mid-load.

## The map — the main event, and the main problem
This is what I came for: pick my lot. Scrolled to "Interactive Subdivision Plan / Select Your Preferred Lot(s)." Good explanatory text ("Click a lot… you can select up to 3 lots, in order of preference"), a clear **legend** (Available = teal, Reserved = grey-blue, Coming soon = light grey, Your selection = navy), and stage-filter pills (All / Stage 1–7 with lot counts). The legend swatches are easy to read and the filter pills are tappable.

Then the map itself. The whole 145-lot subdivision is crammed into a ~317×214px SVG. Each lot is a sliver. I measured them: **median lot is 15×13 pixels; a common one is 17×7 pixels; 146 of 147 are under 44px in at least one dimension.** My thumb pad is bigger than four lots put together. There is **no zoom button and no pinch-to-zoom on the map** (the only zoom is pinching the whole browser page, which then makes everything else huge and pushes the map around). So selecting the lot I actually want is guesswork. I'd tap, hold my breath, and hope.

When a tap DOES land on a lot, the payoff is great: a **full-screen modal** slides up with the lot details — e.g. "Lot 345, 646m², Large, Pepper Gate West / SW Block, 2 interested, Serviced Land Only $165,000, Optional House & Land Package," an "All lot details indicative" disclaimer, an X to close, and a big full-width **Add to my registration** button. That modal is exactly right for a phone: readable, big touch targets, can't-miss CTA. (Confirmed on Lot 345 and Lot 339 — see screenshots 07 and 09.) The problem is purely getting the tap onto the right tiny sliver in the first place.

## The 3-lot cap
The copy says "you can select up to 3 lots, in order of your preference — your first click is your 1st preference." The page is built around exactly three preference slots — I only ever see "1st preference / 2nd preference / 3rd preference," never a 4th, and the messaging includes "already" wording when you're at the limit. So the cap is 3 and it's baked into the UI, not just a sentence. I couldn't cleanly stress-test a 4th tap because the heavy map kept crashing the browser I was testing through (see caveat), but the structure is unambiguous: three slots, no fourth.

## The registration form
Once a lot is added, the registration form below comes alive (before that it shows a friendly "Pick a Lot Above to Begin" gate — good, no confusing empty form). The form has Contact Details (First/Last Name*, Email*, Phone, Suburb, Postcode) and an optional "About You" section (I am a… / situation / living situation / when buying / finance status / how did you hear — all dropdowns). Required fields are marked with *. Selected lots show at the bottom with their preference rank and a "set your price expectation" slot.

Caveat on the form layout: I caught it once rendered at desktop width (the test browser flipped viewport during a crash) and the Contact Details were **two columns**. On a phone that must collapse to one column. Most of the page's grids DO collapse to single column at 375px (6 of 8 measured), and the two that stay 2-up are just the stat tiles (fine). I could not get the form itself to open at a locked 375px to screenshot it single-column, because the map kept crashing the browser before I could add a lot and scroll down. So: **likely fine, but UNVERIFIED at 375px** — flagging it rather than asserting it.

## Would Marcus finish?
On a good connection and with patience, yes — the modal + form path works and is well-built. But the lot-picking is frustrating enough that a real Marcus would either give up, or just tap *near* where he wants and accept whatever lot the modal shows him (defeating the "pick your preferred lot" promise). And he'd be squinting at the 8–12px labels the whole way. The bones are excellent; the map's tap-targets and the small-text spread are what drag it to a fail.

— Marcus

---

## Caveat on tooling (not a site defect, but it shaped this run)
The headless test browser repeatedly **crashed on the map section** ("page crashed" / "target closed" / viewport reset to 1280px). This matches a known artifact of the constrained browse daemon on this heavy estate-map page — it is NOT presented as a site bug. It did limit me: I could not complete a locked-375px walk of add-3-lots → reject-4th → submit in a single uninterrupted session, so the cap and the form's single-column layout are evidenced structurally (copy, slot count, grid collapse) rather than via a clean end-to-end mobile screenshot. The map's tap-target sizes, the no-zoom finding, the font sizes, and the no-horizontal-scroll finding were all measured directly at 375px and are solid.

---

## Standards Check
- §1 Responsive — no horizontal scroll at 375px: ✅ (scrollWidth == innerWidth == 375 throughout)
- §1 Responsive — nav collapses to thumb-reachable mobile pattern: ✅ (44×44 hamburger top-right → drawer with X)
- §1/§3 Touch targets ≥44px — chrome buttons: ✅ (hamburger 44×44; modal "Add" full-width; CTA large)
- §1/§3 Touch targets ≥44px — **map lots**: ❌ BLOCKER (median lot 15×13px; 146/147 under 44px; no zoom control)
- §1/§3 Body text ≥16px on mobile; nothing <12px: ❌ BLOCKER (eyebrow labels 8.8–10.4px; 16/29 paragraphs 12–14px)
- §3 Tables/grids have a mobile strategy: ✅ (grids collapse to 1-col at 375; map is a contained SVG, not overflow; designs gallery is a vertical stack)
- §5 Explanatory header present: ✅ (hero intro + a dedicated header on the map section and the registration section)
- §9 Zero dead ends; primary action (register) completable with a thumb: ⚠️ partial — modal→Add→form path works, but the un-tappable map upstream means a thumb user often can't select the *intended* lot; form single-column at 375px UNVERIFIED due to daemon crashes
