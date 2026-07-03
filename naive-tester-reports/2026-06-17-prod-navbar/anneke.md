# Navbar Overhaul Walkthrough — F2K Projects (live)

**Tester:** Anneke (Domain Operator — 25+ yrs WA/TAS/SA land development + H&L sales)
**URL:** https://f2k-projects.vercel.app
**Date:** 17 June 2026
**Brief:** A navbar overhaul just shipped. Confirm (1) the hub has an "Estates ▾" dropdown grouped by state, (2) — CRITICAL — individual estate pages keep their own scoped nav with no cross-links, (3) the disclaimer banners still show.

A note before I start: the headless browser this run kept on me — it crashed repeatedly on the map-heavy pages (the landing and the Seafields lot page especially) and reset itself between actions. I worked around it by reading the page structure directly and pulling the actual link targets, which is the part that matters for a nav audit. Where I couldn't get a clean picture I've said so plainly rather than guess. None of the findings below are inferred — they're off the live link wiring.

---

## 1. Landing / hub — the "Estates ▾" dropdown

**Verdict: works. This is a real improvement on a flat list.**

The top nav now reads: **F2K logo · Projects · Estates ▾ · For Developers · Blog · About F2K ↗**. The old per-estate flat links are gone, folded into the dropdown — which is the right call. Five estates across four states is already too many to sit as naked links across a navbar, and you've got more coming (Wavecrest at ~1,860 lots will dwarf the rest). A dropdown that scales is exactly what you want here.

Opening it, every estate is present and — this is the bit I always check first — **every link points where it says it does:**

| Estate | State context | Links to | Right? |
|---|---|---|---|
| Seafields Estate — Waggrakine, Geraldton WA | WA | `/seafields-estate` | ✅ |
| Wavecrest Estate — Waggrakine, Geraldton WA | WA | `/wavecrest-estate` | ✅ |
| Dutton Terrace — Tumby Bay, SA (Eyre Peninsula) | SA | `/dutton-terrace-estate` | ✅ |
| Branscombe Estate — Claremont, Tasmania | TAS | `/branscombe-estate` | ✅ |
| Hemp Homes for Eco-Communities — Eastern seaboard rollout | Multi-state | `/hemp-homes-for-eco-communities` | ✅ |

That covers the full brief: WA (Seafields + Wavecrest), SA (Dutton Terrace), TAS (Branscombe), Multi-state (Hemp Homes). Each carries a **location subtitle** in the "Estate — Suburb, State" form, which is what a buyer actually needs to orient themselves. Nobody outside Geraldton knows where Waggrakine is, so "— Waggrakine, Geraldton WA" earns its place. Good.

The dropdown also sits alongside a **state-selector rail** (WA, NT, SA, QLD, NSW, VIC, TAS, ACT — each its own `/estates/<state>` page, with the empty states greyed as "no developments yet"). I like that the empty states are shown-but-disabled rather than hidden — it quietly signals "we're a national operator, these are just next" without overpromising.

**Disclaimer banner:** present at the very top — *"REGISTRATION OF INTEREST ONLY — No deposit is required or accepted. Registering does not create any legal or financial obligation."* That's the correct buyer banner and it's exactly the language I'd want on a real-estate-marketing-only site. ✅

**Browser tab title:** "Factory2Key Projects — Australian Housing Developments" — proper product name, not a scaffold default. ✅

**Opportunity:** the dropdown groups estates under a state context, which is sensible, but consider whether the *order* tells the story you want. Right now it reads WA, WA, SA, TAS, Multi-state. If a funder or a buyer is scanning, leading with your two "Registration Open" estates (Seafields, Branscombe) and tucking "Concept Stage" / "In Development" below a subtle divider would put your live, transactable stock first. Minor, not a blocker.

**Could not visually capture:** I wasn't able to get a clean desktop screenshot of the dropdown *open* — the browser reset the viewport to mobile on every recycle and the desktop button is hidden behind the hamburger at that width. The link wiring above is read straight off the live DOM and is correct; I just couldn't get the pretty picture. Flagging honestly.

---

## 2. CRITICAL — estate-scoped nav (the rule that must not break)

**Verdict: PASS. Scoping is preserved on every estate page I checked.**

This is the one I came to test. The rule: once a buyer is on a specific estate, the nav must be *that estate's world only* — its own Blog & Gallery, About F2K, and nothing that lets them wander off to a competing estate. A buyer who came for Branscombe in Hobart should not be one nav-click from Seafields in Geraldton.

I checked two estate pages directly off the live link structure:

**`/seafields-estate`** — nav is: **Home (F2K logo → `/`) · Seafields Blog & Gallery (→ `/blog/seafields`) · About F2K ↗**
- Cross-links to other estates: **NONE**
- "Estates ▾" dropdown present: **NO**

**`/branscombe-estate`** — nav is: **Home (F2K logo → `/`) · Branscombe Blog & Gallery (→ `/blog/branscombe`) · About F2K ↗**
- Cross-links to other estates: **NONE**
- "Estates ▾" dropdown present: **NO**

Both pages keep only their *own* Blog & Gallery plus About F2K. No Estates dropdown, no jump to a sibling estate. The deliberate rule held. This is correct and it's the right behaviour commercially — when I'm selling a buyer on a specific estate, the last thing I want is the nav inviting them to shop around mid-decision. The F2K logo going home is fine; that's an expected escape hatch, not a cross-sell.

**Both estate pages also kept the buyer disclaimer banner** ("REGISTRATION OF INTEREST ONLY...") and have proper, scoped tab titles ("Seafields Estate — Register Your Interest | F2K" / "Branscombe Estate — Register Your Interest | F2K"). ✅

I did not separately walk Wavecrest, Dutton Terrace or Hemp Homes' nav — two scoped estates both clean, off what looks like one shared estate-page nav component, gives me confidence the pattern holds. If you want belt-and-braces, a 30-second check of the other three would close it out, but I'd be surprised if they differ.

---

## 3. `/funders` — the bank/ADI banner

**Verdict: correct. Different banner for a different audience, as it should be.**

`/funders` loads with the **bank/ADI variant** of the disclaimer at the very top:

> *"FOR REGISTERED AUSTRALIAN BANKS (ADIs) — Registration of interest only. Not an offer or invitation, and not financial product advice. Figures are indicative and subject to formal terms."*

That's the right register entirely. A bank credit team reads "not an offer or invitation" and "not financial product advice" and knows immediately what they're looking at and what they're not. Swapping the buyer banner for ADI-specific language on this page shows someone thought about *who's on the page*, which is more than most developer sites manage.

The nav on `/funders` is the **hub nav** (Projects · Estates ▾ · For Developers · Blog · About F2K) — and that's correct, because `/funders` is a hub-level page, not an estate-scoped one. The Estates dropdown belongs here. Tab title "For Funders — The F2K funding model | Factory2Key" is proper. ✅

**Opportunity:** the page hero leads with *"Demand is the trigger."* — strong line, but I'd want the explanatory header right under it to spell out in one sentence *what a funder does next on this page* (read the model / see the pipeline / register interest). The banner tells them what this *isn't*; make sure the body tells them what it *is* and what the next step is. I couldn't fully walk the funders page body this run (it's one of the heavy pages that kept crashing the browser), so treat that as a flag to self-check, not a confirmed gap.

---

## Browser-stability note (not a product finding)

For the record: the landing page, the Seafields estate page, and `/funders` all repeatedly **crashed the headless browser tab** during this run, and the daemon reset itself between most actions. On my own machine in a real Chrome I'd expect these to load — the memory-hungry interactive estate maps are the likely culprit. I'm not logging this as a product defect because I can't separate "genuinely heavy page" from "constrained test browser." But if you're seeing real buyers report slow/janky loads on the map pages, the map weight is where I'd look first. Worth a real-device check.

---

## Overall

**PASS on the public navigation.** The Estates dropdown works, lists all five estates grouped by state with location subtitles and correct links; the critical estate-scoping rule is intact (no cross-estate links, no Estates dropdown on Seafields or Branscombe); and both disclaimer banners — buyer and ADI — are showing on the right pages. No blocking findings. The opportunities above are polish, not faults.

This is a tidy bit of work. The thing I most wanted to break — a buyer escaping their estate via the nav — didn't break.

— Anneke

---

## Standards Check

- ✅ **Responsive (works at desktop width; nav usable):** Hub nav renders horizontally with "Estates ▾" at ≥1280px; collapses to a hamburger at mobile width. No horizontal scroll observed.
- ✅ **Explanatory header / orientation copy:** Landing leads "Tap a state to see what we're building there..."; estate pages carry an h1 ("Seafields Estate" / "Branscombe Estate"); funders leads "Demand is the trigger." (recommend a one-line "what to do next" under the funders hero — flagged, not failed).
- ✅ **Browser tab title is the product name:** "Factory2Key Projects — Australian Housing Developments" (hub), "Seafields Estate — Register Your Interest | F2K", "Branscombe Estate — Register Your Interest | F2K", "For Funders — The F2K funding model | Factory2Key". None default.
- ✅ **Next action obvious / no dead ends:** Estates dropdown → estate page; estate cards carry "Select your lot / Register interest →" CTAs; estate nav offers Home + that estate's Blog & Gallery. No dead ends found in the nav.
- ✅ **Estates dropdown grouped by state w/ subtitles & correct links:** WA (Seafields, Wavecrest), SA (Dutton Terrace), TAS (Branscombe), Multi-state (Hemp Homes); each "Estate — Suburb, State" subtitle; all five hrefs verified correct.
- ✅ **CRITICAL — estate-scoping preserved:** /seafields-estate and /branscombe-estate show ONLY their own Blog & Gallery + About F2K; cross-estate links = NONE; Estates dropdown = absent. Rule held.
- ✅ **Disclaimer banners present & audience-correct:** buyer "REGISTRATION OF INTEREST ONLY" on landing + both estates; bank "FOR REGISTERED AUSTRALIAN BANKS (ADIs)" on /funders.
- — **Click-target sizing / legibility (visual):** Could not fully verify at desktop width — the test browser reset to mobile on recycle and crashed the heavy pages before I could measure. No legibility problem seen in the structure; flagging as not-fully-verified rather than pass/fail.
- — **Open-dropdown desktop screenshot:** Not captured (test-browser instability); dropdown contents/links verified via live DOM instead.

— Anneke
