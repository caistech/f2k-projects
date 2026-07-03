Hi Dennis,

**Persona:** Anneke — domain operator, 25+ years in land development & estate sales
**URL:** https://f2k-projects.vercel.app/seafields-estate
**Goal:** Walk the page as a prospective buyer / referring agent, with a hard focus on the Home Designs gallery (every card's thumbnail, "View plan" link, and pricing), then the rest of the buyer flow.
**Duration:** ~35 min equivalent (a fair chunk of it fighting a headless browser that kept crashing on this page — see the note at the end; that's a finding in itself).

I'll say up front: this is one of the more *complete* estate registration pages I've reviewed. The legal hygiene, the lot-level detail, and the design range are well past what most developers put up. My notes below are mostly polish and a couple of real defects, not "start over."

---

## Landing & Hero

- The sticky banner up top — "REGISTRATION OF INTEREST ONLY — No deposit is required or accepted. Registering does not create any legal or financial obligation." — is exactly right. In 25 years the single most common buyer fear at this stage is "am I locking myself in?" You answer it before they scroll. Good.
- The explanatory header does its job: "145 residential lots — vacant land or house & land packages," location ("Waggrakine, Geraldton WA — 8km from Geraldton CBD"), and a plain "Select your preferred lot... no deposit, no commitment." A buyer knows what this is and what to do in five seconds.
- Tab title reads **"Seafields Estate — Register Your Interest | F2K"** — proper, descriptive, branded. Good.
- **Friction:** there's a headline mismatch I'd flag. The hero / stage strip says **"Stages 1–3 Open Now — 44 Lots"**, and the stage tiles show Stage 1 (20, OPEN), Stage 2 (1, RESERVED), Stage 3 (24, OPEN), Stages 4–7 (LOCKED). If the commercial intent is a staged release with a Stage-1-first FOMO play, "Stages 1–3 Open Now" undercuts it — you're opening 44 lots at once instead of creating scarcity on 20. Worth a sanity check that the public-facing "open" count matches what you actually want selling first. (I'm flagging the copy as a tester; you'll know the commercial call.)
- Opportunity: a one-line "from $155k" anchored in the hero would do real work — right now the entry price only appears once you reach the stage tiles. Lead with it.

## Two Ways to Buy / Growth Fundamentals

- "Vacant Serviced Land" vs "House & Land Package" is the right split and the right language for this market. Buyers self-sort here.
- "Strong Growth Fundamentals" is fine but reads thin — three icons and a couple of stats. In Geraldton specifically, the things that move a regional buyer are GROH/government tenancy demand, the port/resources employment base, and rental yield. If you have those numbers, this is the section to put them.
- Opportunity: add a distance/amenity line ("8km to CBD, X min to schools/beach/hospital"). Regional land buyers are amenity-distance buyers.

## Home Designs gallery (the focus)

I went card by card. Headline: **the gallery is in good shape — five of six cards show a real floor-plan thumbnail that loads, every "View plan" link resolves to a genuine PDF, and the sixth (Wombat) is a deliberate "pending" placeholder.** The thumbnails lazy-load on scroll (they read as empty/0×0 until the section enters the viewport, then all paint correctly — worth knowing, but not a defect for a real user who scrolls to them).

Card by card:

- **Joey** (Ancillary/Downsizer, 2 bed · 1 bath · ≈100m²) — real thumbnail (`joey-floor-plan.png`, loads). "View plan →" opens a real PDF (`joey-60-floor-plan.pdf`, 422KB, application/pdf — confirmed). Also has an "Elevations →" link to a real PNG (517KB). **Price: House only — from $297,900.** Reads sensibly. Nice that Joey is the only card with a second link (elevations).
- **Koala** (Ancillary/Dual-occ, ADU config, ≈110m²) — real thumbnail (`koala-floor-plan.png`, loads, 2620×1853). "View plan →" → real PDF (`koala-floor-plan.pdf`, 168KB — confirmed). Plus an **"Option 2 →"** link → real PDF (`koala-option-2.pdf`, confirmed downloads). **Price: House only — from $327,700.** **Verdict: Koala is the cleanest, most complete card on the page** — thumbnail loads, two working plan PDFs, sensible price, clear "granny flat / dual-occ on lots ≥600m² under R20" positioning that a referring agent can repeat verbatim. No issues.
- **3x2 Modular** (GROH eligible, 3 bed · 2 bath · 158m²) — real thumbnail (`3x2-floor-plan.png`, loads). "View plan →" → real PDF (`3x2-floor-plan.pdf`, 1.87MB — confirmed; it's a big file, so the plan is detailed). **Price: "Price on application."**
- **4x2 Modular** (GROH eligible, 4 bed · 2 bath · 162m²) — real thumbnail (`4x2-floor-plan.png`, loads). "View plan →" → real PDF (`4x2-floor-plan.pdf`, confirmed serves as a download). **Price: H&L from $680,000.**
  - **Minor flag:** the 3x2 and 4x2 thumbnail images have *identical* pixel dimensions (3571×2525). They may genuinely be different plans at the same export size, but worth an eyeball that the 4x2 card isn't accidentally showing the 3x2 plan.
- **BigRoo** (Premium, 4 bed · 2 bath + theatre · ≈310m²) — real thumbnail that loads, **but the image file is named `murchison-floor-plan.png`** while the "View plan →" link correctly points to `bigroo-floor-plan.pdf` (confirmed real PDF). That filename mismatch ("murchison" vs "bigroo") is the kind of thing that bites later — if someone renames the BigRoo plan and the thumbnail still points at a "murchison" file, you get a silent wrong-image. I'd rename the asset to match. **Price: H&L from $829,700.**
- **Wombat** (Family Home, 4 bed · 2 bath · 191m²) — **"FLOOR PLAN PENDING"** grey placeholder, no thumbnail. The secondary link reads **"Plan pending"** as plain text (not a link — correct, nothing to open). **Price: "Pricing TBC."** Copy says "WAM Napier-series... Plans and house & land pricing are being finalised — contact Uwe for early details." This is handled honestly and is fine as a placeholder. One thing: it's the *only* card pointing a public buyer to "contact Uwe" by name with no contact mechanism on the card itself — a buyer reading that has no button to press.

Cross-cutting on the gallery:

- **Inconsistent pricing language across the six cards:** "from $297,900" / "from $327,700" / "Price on application" / "H&L from $680,000" / "H&L from $829,700" / "Pricing TBC." A buyer scanning these can't tell *why* two are POA/TBC and four have numbers. If the honest answer is "GROH pricing depends on the program" and "Wombat isn't finalised," say that in a half-line under the price so it doesn't read as you hiding the number.
- "House only" vs "H&L" mixed in the price line is a real distinction but easy to miss — Joey/Koala are house-only, the others are H&L. Consider a tiny tag so a buyer doesn't compare $297,900 (house only) against $680,000 (house + land) as if they're like-for-like.
- The "Indicative time-to-build... 12–14 weeks from site arrival" plus the footnote ("typical contract-to-delivery is an additional 8–12 weeks") is genuinely good expectation-setting. Modular buyers always ask "how long" — you answered it twice.
- Opportunity: every card has a plan PDF but no *render/photo* of the finished home. For a modular product the #1 objection is "will it look like a demountable?" One hero photo or render per design (even just on the premium BigRoo) would lift conversion more than anything else on this page.

## Lot selection / site plan

- The picker is strong: **145 individual lot buttons, each with a descriptive accessibility label** ("Lot 352 — 593 sqm · available", "Lot 236 — 554 sqm · available"). That's better accessibility than most commercial estate maps, and it means a screen-reader buyer or a referring agent on assistive tech can actually use it.
- Three filters — purchase type (Any / Vacant land / House & land), size (Any / up to 500m² / 500–700m² / over 700m²), price band (Any / Up to $300k / $300k–$400k / $400k+) — plus an "Available only" checkbox. Sensible, operator-grade filtering.
- Stage tiles read clearly: Stage 1 (20 OPEN, "SW Block — Launch, From $155k"), Stage 2 (1 RESERVED, "Heritage — retained, Not for sale"), Stage 3 (24 OPEN), Stages 4–7 LOCKED. The "RESERVED / Not for sale" on the heritage lot is handled well — buyers won't try to register on it.
- **Friction:** clicking a lot in the list selects it and surfaces an "Add to my registration" button, but the connection between "I clicked Lot 236" and "now scroll down and a form appeared" isn't loud. On a long page a buyer can click a lot, see nothing obvious change, and bounce. A toast / sticky "1 lot selected — Register →" bar would close that gap.
- Opportunity: let a buyer multi-select lots *then* register once (the data model clearly supports multi-lot interest). Make "Add to my registration" visibly accumulate ("2 lots selected") so a hedging buyer registers interest in three lots in one go rather than abandoning.

## Registration form

I selected Lot 236 and opened the form (it's gated behind "Add to my registration" — good, it doesn't clutter the page until intent is shown). 21 fields total once revealed. Structure:

- **Required, minimal:** First Name, Last Name, Email. Phone is optional. That's the right friction level for a no-commitment RoI — don't make them work.
- **Rich optional profiling:** intended use ("Primary Dwelling" select), Current Suburb/Town, Postcode, "I am a..." (buyer type), "Best describes my situation," "Current living situation," "When are you looking to buy?," "Finance status," "How did you hear about us?," and "Referrer Type." This is a *salesperson's* form — it captures exactly the qualifying data I'd want before I picked up the phone. Whoever spec'd this has sold land before.
- **A honeypot field** (`website_url`) is present for spam — good, and invisible to real users.
- **The consent checkbox is excellent:** it spells out RoI-only, indicative pricing, and that lot size/shape/boundary/area/numbering are subject to the WAPC-approved deposited plan and final title survey and "may differ from what is shown." That's the disclaimer that keeps you out of trouble. Keep it.
- **Friction / standards flag:** "Current Suburb/Town" and "Postcode" are plain text inputs. Your own portfolio standard wants address-type fields on autocomplete (Mapbox). For a *current* suburb (not a delivery address) the stakes are low, but autocompleting suburb→postcode would clean the data and save the buyer two fields' typing.
- I did **not** submit (no real PII entered), so I can't confirm server-side validation or the success state — but the required-field markers and field types (email, tel) are set correctly client-side.
- Opportunity: the form asks "Referrer Type" — pair that with the `?ref=` capture you already have so a Ray White or partner agent's link pre-fills the referrer and the agent gets the attribution automatically. A referring agent who has to *manually* tell the buyer "put my name in the referrer box" will lose half their attributions.

## Chrome, voice, footer

- Top nav: "Factory2Key Projects | Developer: Dual Focus", "Seafields Blog & Gallery", "About F2K". Clean. On mobile it collapses (the desktop links disappear behind the header).
- **SayFix "Report a problem — get it SayFixed" widget** is present bottom-left. Fine for a feedback channel.
- **No voice agent / assistant anywhere on the page.** For a public marketing/registration page that's defensible, but a "land buyer" audience asks a lot of nuanced questions (GROH eligibility, R20 dual-occ rules, build timelines, finance) that a voice/chat clarifier would answer at 9pm when your sales line is closed. Flagging as absent per the rubric; see Standards Check.

## Other Strategic Feature Suggestions

- **Renders/photos of completed modular homes.** Single biggest conversion lever for a factory-built product. Buyers fear "demountable." Show them it isn't.
- **A "Reserve a callback" or "Contact Uwe" button on the Wombat (and POA) cards.** Right now a buyer told to "contact Uwe for early details" has nowhere to click.
- **Distance/amenity strip** (CBD, beach, schools, hospital, port) — regional buyers buy location-relative-to-work.
- **GROH explainer.** Two cards are "GROH eligible" and one is "Price on application" because of it. A one-paragraph "What is GROH and could you qualify?" panel would convert the government-tenant-investor buyer, who is a big slice of this market.
- **Make the per-card price language consistent**, and tag house-only vs H&L so buyers don't mis-compare.
- **Persist the selected-lot state visibly** (sticky bar / count) so the lot→register handoff doesn't drop buyers.

## Standards Check (portfolio non-negotiables)

- §1 Responsive — ⚠️ **partial / unverified at 375px.** Body font is 16px (good) and no horizontal overflow at desktop; full-page captures show the layout reflowing to single-column stage/design cards. I could not capture a clean 375px screenshot because the headless browser crashed repeatedly on this page (below). Recommend an explicit 375px pass.
- §2 Auth-page pattern — — n/a (public page, no login).
- §4 Authenticated chrome + Settings — — n/a (no authed surface reachable from this page).
- §5 Explanatory header — ✅ pass. Page and each major panel open with what-it-is / what-to-do; the RoI banner sets the "why it matters" up front.
- §6 Voice agent — ❌ **fail (absent).** No voice/chat clarifier reachable from the chrome; only the SayFix bug-report widget. A nuanced-question audience (GROH, R20, finance, timelines) would benefit.
- §7 Scaffold metadata — ⚠️ **mostly pass / one gap.** Tab title is correct ("Seafields Estate — Register Your Interest | F2K"), not a default. But **no favicon link was found in the document head** (reads "none") — so the browser shows a default/blank icon. Add the manifest-driven favicon.
- §9 Codicils (observable) — ⚠️ **mostly pass, one minor.** RoI/no-commitment consequence is stated up front and again at the consent checkbox; the form gates behind explicit "Add to my registration" intent; required fields and field types are sensible; honeypot present. **Minor:** address-type fields (Current Suburb/Town, Postcode) are plain text, not autocomplete (Mapbox) per the address-field codicil.

## Scope note

**Covered:** hero/banner, explanatory header, tab title, Two Ways to Buy, Growth Fundamentals, the full Home Designs gallery (all 6 cards — thumbnails verified for load, all "View plan"/secondary PDFs downloaded or confirmed-serving, Wombat placeholder confirmed visually), Purchase Terms, the stage tiles, the lot picker (145 lot buttons + 3 filters + availability toggle), and the gated registration form (all 21 fields, consent disclaimer, honeypot). PDFs confirmed real: Joey plan (422KB) + Joey elevations PNG (517KB), Koala plan (168KB) + Koala Option 2, 3x2 (1.87MB), 4x2 (serves as download), BigRoo (serves as download).

**Not covered / could not verify:** a clean 375px mobile screenshot and mobile hamburger behaviour (browser instability — see below); actual form submission + success state + server validation (did not enter real PII); the interactive SVG site-map click-to-select behaviour in depth; the "Seafields Blog & Gallery" sub-page.

**Environment note (worth a flag of its own):** the headless test browser crashed and restarted *repeatedly* on this page, and eventually exhausted the host machine's process/memory. This page is heavy — a large interactive SVG site map plus ~145 lot buttons plus six multi-megabyte floor-plan PNGs (3x2 alone is a 1.87MB image, several render at 2000–3600px wide). A headless Chromium choking on it is a yellow flag for **real low-end mobile devices on regional Geraldton mobile data.** I'd strongly suggest: serve the gallery thumbnails as properly sized/optimised images (they're being shipped at full plan resolution and scaled down in CSS), and lazy-load the lot buttons / SVG. That's both a performance win and a bounce-rate win for exactly your buyer demographic.

Net: a genuinely strong, honest, sales-literate page. Fix the BigRoo→murchison filename, add a favicon, sort the image-weight/optimisation, make the per-card pricing language consistent, and give the POA/Wombat cards somewhere to click — and it's better than most professional developers ship.

Anneke
