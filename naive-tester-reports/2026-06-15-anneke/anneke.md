# Seafields Estate — Naive-Tester Walkthrough (Anneke, Domain Operator)

**VERDICT: FAIL — one blocker.** The Joey floor-plan PDF a buyer downloads is branded all over with a third-party manufacturer ("Property Friends", VIC) plus uncleaned placeholder data ("Client: Jane & John Doe", "00 Street Name Suburb QLD 0000"), and its specs contradict the website (PDF: 1-bedroom 60m² granny flat; site: "Joey · 2 bed · 1 bath · ≈100m²"). On a buyer-facing sales page that markets these as "Factory2Key" homes, that is a credibility/brand-leak defect, not polish.

URL tested: https://f2k-projects.vercel.app/seafields-estate
Tested at 1440px and 375px. Public page, no login required.

---

## BLOCKING (❌) FINDINGS — listed first

**❌ B1 — Home-design plan PDFs leak a third-party manufacturer's branding + uncleaned template data, and the specs don't match the page.**
The "View plan →" link on the Joey design opens `…/seafields/designs/joey-60-floor-plan.pdf`. Every one of its 4 sheets carries, in the title block:
> PROPERTY FRIENDS · Eastern Innovation Business Centre · 5A Hartnett Close, Mulgrave VIC 3170 · info@propertyfriends.com.au · (03) 9758 5331 · © 2026 Property Friends All Rights Reserved

…plus template placeholders nobody cleared: **"Client Name: Jane & John Doe"**, **"Project Address: 00 Street Name Suburb QLD 0000"**, "Block No. 000", "Project Code 0001", drafter "H.E.". The page sells these as *Factory2Key* modular homes ("Every Factory2Key home is a factory-built modular dwelling…") — but the document the buyer actually downloads is somebody else's company, in another state, with dummy buyer details. The koala, 3x2 and bigroo PDFs also carry an "All Rights Reserved" copyright block (image-based, couldn't OCR the owner) — they need the same audit.
**On top of the brand leak, the specs disagree:** the Joey PDF is titled a *"Granny Flat — Class 01, 1BR IL/R, GFA 60.00 m²"* (one bedroom, 60m²). The website card says *"Joey · 2 bed · 1 bath · ≈100m²"*. A buyer comparing the card to the plan will see a different house. Both can't be right.
*Why it's a blocker:* a prospective buyer or selling agent who opens the plan immediately distrusts the offer — wrong company name, fake client, wrong bedroom count. This is the single thing most likely to lose a sale on this page.

---

## Section-by-section

### 1. First impression / hero (✅ strong)
Tab title is correct ("Seafields Estate — Register Your Interest | F2K"), no "Create Next App". Clear H1 "Seafields Estate", sub "Land & Lifestyle in Geraldton's Growth Corridor", a persistent honest banner across the top — *"REGISTRATION OF INTEREST ONLY — No deposit is required or accepted. Registering does not create any legal or financial obligation."* That banner is exactly the consequence-clarity I want to see on a no-deposit ROI page; well done. Key facts (145 lots, 445–1522m², from $155k land / $485k H&L, Stage 1 from Q3 2026) are surfaced up front. Hero map thumbnail is stage-coloured.

*Nitpick:* the favicon link wasn't present in the head (no custom icon detected). Minor.

### 2. "About the Development" (✅)
Reads like a real land-sales page: 145-lot subdivision in Waggrakine ~8km north of Geraldton, part of a ~300-lot development with 155+ sold since 2012, flat lots, reticulated services pre-title (~Sept 2026), the $188M Geraldton Health Campus demand driver. Spec table (developer, zoning R20, lot sizes, 8.84ha saleable, CLE planner, plan ref CLE 3027-08B-01 WAPC 202888, covenant on request) is the level of detail a buyer's solicitor wants. Good.

### 3. Development Staging — TERMINOLOGY CONCERN (⚠️)
Heading: **"Stages 1–3 Open Now — 44 Lots."** Body says Stages 1 and 3 are open (20 + 24 = 44 lots), Stage 2 is a single retained heritage lot not for sale, Stages 4–7 LOCKED. That is internally consistent on the page. My flag is a real-world one: a launch that opens **two non-contiguous stages (1 and 3) at once** while telling buyers "register early for best pick without a stage premium" is unusual — most staged land releases open Stage 1 only to create scarcity. If the commercial intent is a Stage-1-only launch, the "Stages 1–3 Open Now" headline oversells availability and dilutes the FOMO. Worth confirming this matches the intended launch strategy. (Not a bug — a strategy/copy alignment question.)

### 4. Interactive subdivision map — LOT SELECTION & 3-LOT CAP

**(a) The 3-lot cap — works at the data level, but the dialog gives NO feedback when you hit it (⚠️ UX).**
I added three lots (345, 339, 238). Each opened a clean teal detail modal (size, category, zone, status e.g. "2 interested", price options, "Add to my registration"). After three were added, the registration review showed them correctly labelled **"1st preference / 2nd preference / 3rd preference"** — exactly the ordered-preference model you'd want. ✅
**But** when I then opened a *fourth* available lot (237), its dialog still showed an **enabled** "Add to my registration" button with no hint that I already have three. I clicked it — and nothing visible happened: the registration still held only 3 unique preferences (no "4th preference" was ever created). So the cap is enforced *silently* in the data, but the UI lets you click "Add" on a 4th lot and gives zero feedback (no "you can only pick 3 — remove one first", no toast, no disabled state, no swap prompt). A real user will think the button is broken. **Fix:** once 3 are selected, the lot dialog's Add button should disable with a "Maximum 3 lots — remove one to change" message (or offer to replace a preference). The instruction copy ("up to 3 lots, in order of preference") is good; the enforcement just needs to *speak*.

**(b) Map colour scheme — the interactive map is clear; the legend layers two colour systems which is busy (⚠️ minor).**
The interactive selection map itself reads well: **available lots are a single teal**, unavailable lots are grey, your selection turns dark navy, and available lots carry a **number badge** showing how many buyers have registered interest — that's exactly the single-clear-colour + interest-badge model the goal asked for. ✅
The friction is the **legend**: directly above the status legend (Available / Reserved / Coming soon / Your selection) sits a *second* colour system — a per-Stage palette (Stage 1 blue, Stage 3 salmon, Stage 4 yellow, Stage 5 green, Stage 6 purple, Stage 7 grey) used by the stage filter chips. So the page presents two unrelated colour codes within a few cm of each other. On the map in "All stages" view the lots are teal/grey (good), but a buyer glancing at the rainbow stage chips first may expect the *lots* to be rainbow-coded. Recommend de-emphasising the stage palette (e.g. neutral chips with a small dot) so the status colours own the map. The hero thumbnail at the very top IS fully rainbow (stage-coloured) — fine as a decorative overview, but it sets a "multi-coloured" expectation the real map then doesn't follow.

**(c) Accessibility — genuinely good.** Each lot is a real `role=button` with a descriptive `aria-label` ("Lot 345 — 646 sqm · 2 interested"). That's better than most builder sites.

### 5. Lot detail dialog (✅)
Clean, on-brand teal modal. Shows size, category (Large/Standard/Premium), zone (Pepper Gate West / SW Block, Sutcliffe Road), live interest status, and the right price option per lot — some show "Serviced Land Only $160k–$165k", others "House + Land Package $610k–$933k". Closes cleanly. Good.

### 6. Two Ways to Buy / Market fundamentals (✅)
"Vacant Serviced Land from $155k" vs "House & Land turnkey from $485k" is clear. Market stats ($533k median Waggrakine, 27% annual growth, <1% vacancy) are the kind of proof points an agent uses. Fine.

### 7. Home Designs gallery (see BLOCKER B1 for the plan PDFs)
The on-page cards themselves are reasonable: Joey, Koala (ancillary/dual-occ), 3x2 Modular (GROH eligible), 4x2 Modular (GROH), EMU (family), BigRoo (premium). No manufacturer name is visible *on the page cards* — good. The brand leak is entirely inside the downloaded PDFs (B1).
Two further content issues:
- **⚠️ 4x2 card says "Floor plan pending"** in its copy, yet a working `4x2-floor-plan.pdf` link exists and loads (2.1MB). Either the "pending" label is stale or the link shouldn't be live. Pick one.
- **EMU** correctly shows "Plan pending" with no link — consistent. Good.
- Joey card "2 bed · ≈100m²" vs PDF "1 bed · 60m²" (the spec mismatch in B1).
All plan assets I checked return HTTP 200 (joey, koala, koala-option-2, 3x2, 4x2, bigroo, joey-elevations.png) — no broken links.

### 8. Purchase Terms (✅ — matches expectation exactly)
Deposit **5%** (within 5 days of contract) · Finance **45 days** · **Settlement "30 days after Titles"** · Covenant **Applies** (available on request). The settlement wording is precisely what the goal specified. Indicative-terms disclaimer present. No issues.

### 9. Registration form (✅ functional; one item unverified)
The form correctly **only appears once you select a lot** ("Pick a Lot Above to Begin" empty state with an explanatory header — good gating). After selecting, a "Review & Set Your Price Expectation" panel appears per lot (price-expectation capture, framed as "not a commitment — helps us gauge market expectations" — nice, honest), followed by the contact form (~21 inputs: name/email/phone/situation etc. visible). The "no deposit / not a promise to buy or sell" disclaimers and privacy note are present at the foot.
- **Unverified (tooling crashed before I could confirm):** whether the buyer's **address field uses autocomplete** (§9 expects Mapbox-style autocomplete, not a plain text box). Flagging as a thing to check, not asserting a fail.

### 10. Footer / contact (✅)
Clear contacts (Uwe + Dennis with emails/phones), privacy link, "Real estate marketing only" disclaimer, and a "Report a problem — get it SayFixed" widget. Good.

---

## Performance note (environmental, but worth a line)
The interactive subdivision map is heavy — it repeatedly crashed a constrained headless browser on full reloads, and the selection map lazy-mounts ~2.5s after its section scrolls into view. On a mid-range phone on Geraldton mobile data, the map may feel slow/janky. Worth a perf check on real mobile hardware (lighten the SVG / defer non-visible polygons).

---

## STANDARDS CHECK
- §1 Responsive — ✅ No horizontal scroll at 375px (scrollWidth == clientWidth); hamburger nav, stacked stats, legible mobile type. Verified 375 + 1440.
- §5 Explanatory header — ✅ Every section has a what/why intro; the map and registration both keep an explanatory header in their empty state ("Pick a Lot Above to Begin").
- §6 Voice agent — ❌ No voice surface on this public buyer page (no convai element, no widget, no "Talk to…" launcher). Soft fail: arguably "could add value" rather than required on a marketing page, but per the rubric a reachable voice surface is expected and none exists here.
- §7 Scaffold metadata — ✅ Tab title "Seafields Estate — Register Your Interest | F2K" (not Create Next App). ⚠️ no custom favicon link detected.
- §9 Codicils — ⚠️ Mixed. Strong consequence-clarity banner ("Registration of interest only, no deposit") and per-lot price-expectation framing ✅; BUT the 3-lot cap fires silently with no feedback on a 4th "Add" click (dead/ambiguous action) ❌; address-autocomplete not verified.

---

## Top fixes, in priority order
1. **(Blocker) Re-export all home-design plan PDFs** stripped of the third-party manufacturer title block ("Property Friends" + VIC contact) and the "Jane & John Doe / 00 Street Name" placeholders; brand them as Factory2Key (or unbranded). Reconcile Joey's bed-count/area between the card and the plan.
2. **Make the 3-lot cap speak:** disable/relabel the lot dialog's "Add" once 3 are selected, with a "remove one to change" message or a replace prompt.
3. **Resolve the 4x2 "Floor plan pending" vs live PDF** contradiction.
4. **Simplify the map legend** so the teal status scheme owns the map and the per-stage rainbow doesn't compete.
5. Confirm the **"Stages 1–3 Open Now"** headline matches the intended launch strategy (vs Stage-1-only FOMO).
6. Add address autocomplete on the registration form if not already present; consider a voice clarifier for the registration step.

The bones here are good — honest no-deposit framing, a genuinely usable interactive map with proper ordered preferences and accessible lots, and purchase terms exactly as they should read. It's the downloadable plans that would stop me handing this to a client today.

Anneke
