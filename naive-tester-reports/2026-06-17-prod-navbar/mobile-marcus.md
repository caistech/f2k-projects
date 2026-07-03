# Mobile Marcus — F2K Projects navbar test (phone, 375px)

**Tester:** Mobile Marcus (on a phone, fat thumbs, squints at small text)
**URL:** https://f2k-projects.vercel.app
**Viewport:** 375 × 812 (iPhone-ish)
**Date:** 2026-06-17
**What I was checking:** the new navbar on a phone — does the hamburger open a state-grouped estate menu, do estate taps go through, and does an individual estate page show only its own menu links. Plus: is that top disclaimer banner readable and not overlapping.

---

## TL;DR

Mostly good news. The hamburger is a proper thumb-sized button, the estates show up grouped by state, every estate links to the right page, and an individual estate page (Dutton Terrace) correctly shows only its own links — not the whole estate list. No sideways scrolling anywhere. The top "REGISTRATION OF INTEREST ONLY" banner reads cleanly and doesn't overlap anything.

Two gripes from me: the little estate rows inside the menu are skinny (about 20px tall), so my fat thumb is going to brush the wrong one if they're packed close. And a lot of the small print (the banner, the estate menu labels) sits at the bare minimum size where I have to lean in.

**Overall mobile nav verdict: PASS** (with a touch-target niggle worth a look).

---

## What I did, step by step

### 1. Landing page on my phone
Loaded fine. The whole page stacks into one column — Australia map up top, then a card per development (Seafields, Wavecrest, Dutton Terrace, Branscombe, Hemp Homes). **No sideways scrolling** — I checked, the page is exactly 375 wide, nothing hangs off the edge. Good. (`01-landing.png`)

Up the very top there's a dark navy strip with a registration notice, then a white header bar with the F2K logo on the left and a menu button on the right.

### 2. The top disclaimer banner
The navy banner reads **"REGISTRATION OF INTEREST ONLY — No deposit is required or accepted. Registering does not create any legal or financial obligation."** It wraps onto two lines and sits inside the screen — nothing runs off the right edge, nothing overlaps the logo below it. (`03-banner.png`)

It's small though — measured at **12px**. That's the smallest text I'll tolerate before I start pinch-zooming, and legal-ish copy at 12px on a phone is the kind of thing I skim past. Readable, but only just.

### 3. The hamburger menu
The menu button (labelled "Open menu") is **exactly 44 × 44px** — right on the minimum for a thumb. It's pinned top-right where my thumb expects it. Good, I can hit it without fishing.

I tapped it and the menu opened. The estates are listed **grouped by state**, exactly as promised:

- **Western Australia** → Seafields Estate, Wavecrest Estate
- **South Australia** → Dutton Terrace
- **Tasmania** → Branscombe Estate
- **Multi-state** → Hemp Homes for Eco-Communities

All the other state headers are there too (NT, QLD, NSW, VIC, ACT) shown as "no developments yet". So it's a full Australia-by-state picker, not just the active ones. (`04-menu-open.png` shows the landing page; the open-menu structure was confirmed in the page itself.)

Each estate is a real link with the right destination:
- Seafields → `/seafields-estate`
- Wavecrest → `/wavecrest-estate`
- Dutton Terrace → `/dutton-terrace-estate`
- Branscombe → `/branscombe-estate`
- Hemp Homes → `/hemp-homes-for-eco-communities`

The estate labels are 16px — fine to read. **But the tappable rows are only ~20px tall.** That's under the 44px thumb minimum. If those rows are stacked tightly, I'm going to tap Wavecrest when I meant Seafields. Worth checking the vertical spacing between them.

### 4. Tapping into an estate
The estate links resolve to the correct estate URLs (verified the hrefs). I landed on **Dutton Terrace** (`/dutton-terrace-estate`) — page title "Dutton Terrace — Register Your Interest | Factory2Key", renders clean on the phone, single column, **no sideways scroll**. (`07-dutton-menu.png`)

### 5. The estate page's own menu — the important bit
On the Dutton Terrace page I opened the menu again. **It does NOT list the other estates.** It shows only:
- the F2K logo (back to home)
- a close button (44px — good)
- **"Register Your Interest →"** (this estate's own action, 52px tall — nice and tappable)
- the SayFix "Report a problem" link

So an individual estate page gives me only that estate's links, not the whole estate list. That's exactly the behaviour I was told to check. ✅

I also checked the **/developers** page menu for contrast — it likewise carries the hamburger (44px) but no estate accordion. So the menu is context-aware: full state-grouped estate list on the home page, estate-specific links on an estate page, none on the developer page. Consistent.

---

## Niggles (Marcus being Marcus)

1. **Skinny estate menu rows (~20px tall).** Under the 44px thumb target. My main fat-thumb worry — taps could land on the neighbouring estate. Please check the row spacing/padding. *(touch target)*
2. **Lots of 12px small print.** The disclaimer banner is 12px; it reads, but it's the floor. I lean in to read it. *(readability — borderline, not a hard fail)*
3. **The map page is a heavy beast.** Not a nav bug, but the home and estate pages are clearly doing a lot of work — on my patchy phone connection these felt slow to come alive. (Tooling note below.)

---

## Tooling note (honesty)

The headless browser kept crashing/recycling on the **home page and the map-heavy estate pages** (Seafields, Branscombe) — they're render-heavy. I got clean reads of the home page and Dutton Terrace by cold-restarting and retrying. The data above (hamburger size, state grouping, estate hrefs, the estate-page-only menu) all comes from pages that actually loaded and held — I did not fabricate anything from a crashed load. Seafields and Branscombe estate pages I could not get to hold long enough to open their menus; based on the shared navbar and the Dutton + /developers behaviour, I'd expect them to behave the same, but I'm flagging that I didn't directly eyeball those two.

---

## Standards Check

| Check | Result | Evidence |
|---|---|---|
| 375px: no horizontal scroll | ✅ | docScrollW = 375 on landing, Dutton, /developers; `overflow:false` every probe |
| Nav collapses to usable hamburger reachable with thumb | ✅ | "Open menu" button top-right, 44×44px, opens on tap |
| Estates appear grouped by state in menu | ✅ | WA: Seafields, Wavecrest · SA: Dutton Terrace · TAS: Branscombe · Multi-state: Hemp Homes; all 8 states + Multi-state headers present |
| Tapping an estate goes to its page | ✅ | hrefs: /seafields-estate, /wavecrest-estate, /dutton-terrace-estate, /branscombe-estate, /hemp-homes-for-eco-communities; landed on Dutton (200) |
| Estate page shows only its own links | ✅ | Dutton menu = logo + close + "Register Your Interest →" + SayFix; no other estates listed |
| Hamburger touch target ≥44px | ✅ | 44 × 44px exactly (home, Dutton, /developers) |
| Estate menu rows touch target ≥44px | ❌ | estate `<a>` rows ~20px tall — under 44px (fat-thumb collision risk) |
| Base text ≥16px / nothing under 12px | ⚠️ | estate menu labels 16px (ok); disclaimer banner 12px (at the floor, borderline-readable, nothing under 12px) |
| Top disclaimer banner readable, not overlapping | ✅ | "REGISTRATION OF INTEREST ONLY…" wraps to 2 lines, within 375px, no overlap with logo; 12px white on navy |
| Menu opens/closes cleanly; links tappable without mis-hit | ✅ (open/close) / ⚠️ (mis-hit) | opens reliably; close button 44px; but 20px estate rows raise mis-tap risk |

**Mobile nav overall: PASS** — the state-grouped estate menu works, links go to the right pages, estate pages show only their own links, no horizontal scroll. The one ❌ is the ~20px estate menu rows (touch target); the disclaimer's 12px is a borderline readability ⚠️, not a blocker.

---

That's me done.

Marcus
