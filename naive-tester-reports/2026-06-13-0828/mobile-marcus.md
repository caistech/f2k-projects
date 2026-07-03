# Mobile Marcus — Seafields Estate walkthrough (phone only)

Hi Dennis,

I went through the whole Seafields Estate page on my phone. Here's how it went.

- **Persona:** Mobile Marcus — phone only (iPhone-sized, 375px wide), fat thumbs, dodgy signal, pinch-zooms to read small text.
- **URL:** https://f2k-projects.vercel.app/seafields-estate
- **Goal:** Browse the whole page on a phone; specifically poke at the Home Designs gallery (Joey, Koala, 3x2, 4x2, BigRoo, Wombat) — do the cards and floor-plan previews render and reflow? Does tapping the Koala preview expand it? Do "View plan" links open? Then judge the rest (hero/site plan, lot info, registration).
- **Duration:** ~30 min equivalent.

One upfront note: your live map page is HEAVY. The headless phone browser I'm driving kept crashing and reloading the tab on this page — repeatedly. More on that at the end, because a real phone with less RAM than my testing rig would feel the same wobble.

---

## 1. Landing / hero — solid

First thing I see is a clear black banner: **"REGISTRATION OF INTEREST ONLY — No deposit is required or accepted..."**. Good, I know what I'm walking into. Below it: F2K logo + "Factory2Key Projects", a hamburger top-right, then a big "Seafields Estate" headline, "145 residential lots", the location, a plain-English explainer ("Select your preferred lot on the subdivision plan — no deposit, no commitment...") and a fat teal **"Select your lot →"** button.

- Tab title reads **"Seafields Estate — Register Your Interest | F2K"** — proper product name, not "Create Next App". ✅
- **No horizontal scroll** at 375px. I measured it: page width = screen width = 375px exactly. Nothing pokes off the side. ✅
- Headline text is big and crisp (40px). Body copy reads fine, no pinch-zoom needed for the hero. ✅
- The teal CTA is thumb-sized and obvious. ✅
- The hamburger (☰) is a proper 44×44px tap target with padding — I didn't fat-finger it, and tapping it slides in the "Seafields Blog & Gallery" and "About F2K ↗" links. ✅ Nav collapses to a usable mobile pattern.

Opportunity: nothing to fix in the hero. This is the strongest part of the page on mobile.

---

## 2. Home Designs gallery ("Modular Homes Built to Plan") — mostly good, two snags

This is what you asked me to hammer. The section heading is "Modular Homes Built to Plan". I found six cards: Joey, Koala, 3x2 Modular, 4x2 Modular, BigRoo, and Wombat.

**The good (this reflows properly):**
- The five real floor-plan preview images (Joey, Koala, 3x2, 4x2, BigRoo) each render at **341px wide inside my 375px screen — no overflow, no off-screen bleed.** They stack in a single column on the phone. ✅
- Each preview is itself a big tap button — measured **341×256px** (`Expand Joey floor plan`, `Expand Koala floor plan`, etc.). Massive, impossible to miss with a thumb. ✅
- The Koala preview IS wired as an expand control — it's a real button labelled "Expand Koala floor plan", and the Koala thumbnail PNG loads fine (returns 200). So tapping it is meant to enlarge the plan. (I couldn't get a clean screenshot of the open enlarged view because the browser tab kept crashing on me mid-tap — flagged at the end — but the expand button is correctly built and present.)
- Every **"View plan →"** link points at a real PDF, and I checked all six: they ALL return **200 / application/pdf**. So the plans genuinely open:
  - Joey → joey-60-floor-plan.pdf ✅
  - Koala → koala-floor-plan.pdf ✅ + a second "Option 2 →" → koala-option-2.pdf ✅
  - 3x2 → 3x2-floor-plan.pdf ✅
  - 4x2 → 4x2-floor-plan.pdf ✅
  - BigRoo → bigroo-floor-plan.pdf ✅
  - Joey "Elevations →" → joey-elevations.png ✅

**Snag 1 — the text links under the cards are too small for a thumb. ❌**
"View plan →", "Elevations →" and "Option 2 →" measure only about **67×16px** (16px tall). That's well under the 44px minimum, and the text height suggests ~14px font — below the 16px I can read without zooming. On a real phone these little arrow-links sit close together; I'd fat-finger between "View plan" and "Option 2" on the Koala card. The big image-button is fine, but if I want the actual PDF I have to hit a tiny link. Opportunity: make these into proper button-sized tap targets (≥44px tall, ≥16px text), or let the whole card row be tappable.

**Snag 2 — the Wombat card is a different animal. ⚠️**
Wombat has NO floor-plan preview image and NO "View plan" link. Its text says: "WAM Napier-series 4-bedroom 2-bathroom modular home, 191m². Plans and house & land pricing are being finalised — contact Uwe for early details." So it's a deliberate coming-soon card — fine in principle — but it sits in the same row as five complete, image-led cards and looks visually broken/empty by comparison. On a phone the missing thumbnail leaves an odd gap. Opportunity: give Wombat a "Coming soon" placeholder tile or a muted style so it reads as intentional, not as a card that failed to load.

---

## 3. Site plan / lot map — works, but it's the heavy bit

The interactive subdivision plan has view toggles (Plan view / Satellite / Schematic grid / Official drawing), filter dropdowns (type / size / price), an "Available only" checkbox, and stage buttons (All stages (145), Stage 1 (20), Stage 2 (1), etc.). On the phone everything fits in the column — no sideways scroll.

- The lot map itself is **186 individual tappable lot buttons** (Lot 307, 308...). Each has a clear aria-label like "Lot 238 — 815 sqm · available" or "Reserved — Lot 344". Good for knowing what I'm tapping. ✅
- The stage filter buttons and dropdowns are reachable. ✅

Opportunity / concern: this is exactly where my browser tab crashed, over and over. 186 live buttons + the SVG map is a lot to paint on a phone. On a real mid-range Android with intermittent signal (me), a page this heavy risks a white-screen reload right when I'm trying to pick a lot — which is the one action you most want to survive. Worth a look at lazy-rendering the map or trimming the DOM weight.

---

## 4. Lot info + registration — gated cleanly, no dead end

I scrolled to the bottom. Before picking a lot, the registration area shows **"Pick a Lot Above to Begin — The registration form opens after selecting a lot."** That's a good zero-dead-end pattern: it tells me exactly what to do next instead of showing an empty form. ✅ The page reinforces "Register your interest — no deposit required" throughout, so the ask is consistent and low-pressure.

I couldn't fully drive the form (it only appears after tapping a lot, and the tab kept crashing on the map). From the markup the registration is interest-only — no address field surfaced, which is consistent with "no deposit, no commitment", so the missing address autocomplete is probably fine here rather than a miss.

Opportunity: once a lot is tapped, make sure the form scrolls itself into view and the submit button is full-width on mobile (couldn't verify live due to the crashes).

---

## 5. Voice agent — I couldn't find one ❌

There's a "Report a problem — get it SayFixed" button (nice), but no voice assistant / "ask about this" surface anywhere in the chrome. The portfolio standard wants a voice agent reachable in ≤3 clicks. On this page I found none.

---

## Standards Check (focus on §1 Responsive)

- §1 Responsive — no horizontal scroll @375px (375=375) ✅; floor-plan images 341px, no overflow ✅; nav collapses to a 44×44px hamburger drawer ✅
- §1 Touch targets — hamburger 44×44 ✅, Expand buttons 341×256 ✅, BUT "View plan/Elevations/Option 2" links ~67×16px ❌
- §1 Text size — h1 40px ✅, hero body readable ✅, BUT the card sub-links render ~14px (<16) ❌
- §5 Explanatory header — clear hero + banner explaining what-it-is/what-to-do/why ✅
- §6 Voice agent — none reachable from chrome ❌
- §7 Scaffold metadata — title "Seafields Estate — Register Your Interest | F2K", og:title set ✅
- §9 Zero dead ends — "Pick a Lot Above to Begin" prompt + "Select your lot" CTA make next action obvious ✅
- §9 Address autocomplete — n/a (interest-only form, no address required) —
- §11 Agent-discoverable — /llms.txt returns 404 (minor) ❌
- Performance/stability — page repeatedly crashed the mobile tab under the 186-button lot map ⚠️ (flag, not a clean pass)

---

## Scope note

I tested **only** the live page at the URL above, on a 375px phone viewport — no source, docs, or repo files read. PDF/asset link checks were done by fetching the URLs directly (all returned 200/application/pdf) because the headless phone browser kept crashing on the heavy map page, which also stopped me capturing a clean screenshot of the Koala plan in its enlarged state or driving the registration form to submit. The Koala expand control and the View-plan links are confirmed present and correctly wired; what I couldn't film was the open modal itself.

Marcus
