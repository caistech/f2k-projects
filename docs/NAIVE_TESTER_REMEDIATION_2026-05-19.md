# Naive-Tester Remediation Plan — f2k-projects

**Date:** 2026-05-19
**Tester persona:** Megan, 35, first-home buyer, husband + 4yo, $650k–$850k budget, regional NSW / SEQ. Tested on iPhone Safari, ~25 min, late evening.
**Source report:** `C:\Users\denni\naive-tester-reports\2026-05-19-1711\f2k-projects.md`
**Status:** Plan only — DO NOT EXECUTE FIXES. Awaiting Dennis sign-off.

---

## 0. What's working (keep, don't touch)

These landed well in Megan's walkthrough and must not regress in any of the fixes below:

- **"REGISTRATION OF INTEREST ONLY — No deposit required or accepted"** banner at the top of every project page. Megan called it out as the single most reassuring piece of copy after her experience with the modular site that "took her details six months ago and never wrote back". Keep the copy verbatim. (Visual styling is a separate, lower-priority recommendation — see §7.)
- **Branscombe colour schemes section** with named Dulux palettes (DA Approved / Dark Contemporary / Light Coastal) per home type. Megan: *"the level of detail that makes me feel like I'm dealing with real people who've already made real decisions. Top marks."* Do not collapse, de-emphasise, or remove.
- **Branscombe specification side-table** (developer, location, permit, designer, energy rating, timeline). Megan read it twice — it answers buyer trust questions without scrolling.
- **Seafields purchase-options split** (Vacant Serviced Land "from $150,000" / House & Land Package "from $485,000"). Real numbers at the top of the page is the only reason Megan engaged with Seafields at all.
- **Seafields "indicative — subject to final survey" amber banner** above the subdivision plan, plus the explicit "Pricing shown is indicative" disclaimer beside the consent checkbox. Megan called this *"the kind of legal hygiene that makes me trust the site more, not less"*.
- **Hemp Homes voice** — the "We hear you" section reads "honest, like a podcast, not a property site". Keep the writing untouched; the issues with Hemp Homes are positioning and information hierarchy (§6), not voice.
- **Dennis's name, real photo and phone number in the footer.** Megan flagged she'd put it higher up (see §7), but the presence of a named human with a real number is part of why she'd come back.

---

## 1. Validated findings (verified against repo)

| # | Finding | Repo evidence | Severity |
|---|---------|---------------|----------|
| 1 | **No project photos on Seafields page or homepage card.** Seafields uses `masterplan.jpg` (a technical drawing) as both card image and the only visual on the project page. There are zero photographs of finished F2K homes anywhere on Seafields. | `public/seafields/` contains only `masterplan.jpg`, `site-plan-hires.jpg`, `site-plan.jpg`, `3027-08B-01-DA-plan.pdf` — all technical drawings, no photographs. `src/app/(public)/seafields-estate/page.tsx` has no `<img>` of a built home. | **Critical** |
| 2 | **No price anywhere on Branscombe page.** Megan scrolled three times looking for a dollar figure. | `src/app/(public)/branscombe-estate/page.tsx` lines 87–109 (KEY STATS) show "37 / 3 Bed-2 Bath / 104–114m² / 350–550m² / 2026–2028". No price stat. Search of the file confirms no `$` dollar figure on the page. | **High** |
| 3 | **Video flyover shows "Your browser does not support the video tag" on mobile Safari.** The aerial flyover is the headline visual asset of the Branscombe page. | `src/app/(public)/branscombe-estate/page.tsx` lines 174–188: `<video controls playsInline preload="metadata" poster="/branscombe/home-exterior-1.png">` with a Supabase-signed MP4 source. The poster IS set but Megan reports the fallback text shows anyway — implies either (a) the poster image is failing to render before play, (b) `controls`+`playsInline` together is not enough to elide the fallback text on iOS Safari when the video fails to fetch/decode, or (c) the signed URL has CORS/codec issues with Safari. | **High** |
| 4 | **Branscombe registration form is 18 fields.** Megan: *"as a first-home buyer at 11pm, I'm not filling out 18 fields."* | `src/components/branscombe/RegistrationForm.tsx` — counted from useState declarations: firstName, lastName, email, phone, selectedUnits, pricePrefs, suburb, postcode, buyerType, buyerProfile, currentHousing, purchaseTimeline, financeStatus, howHeard, referrerType, referrerName, referrerCompany, referrerContact, notes, consent. Plus the home-selection picker. = **20 user-input slots.** Confirmed. | **Medium** |
| 5 | **Lot-number duplicates in Seafields data.** Megan clicked Lot 348 and a different tile selected; called out Lot 294 in Stage 6 with same problem. | `src/data/seafields/lots.ts` lines 95–96: `lot(348, 570, SW_BLOCK, "1", { idSuffix: "a", pendingRenumber: true }), lot(348, 570, SW_BLOCK, "1", { idSuffix: "b", pendingRenumber: true })`. Lines 190–191: same pattern for lot 294. The header comment at line 10 already flags this: *"Lots 294a/b, 348a/b: DWG has 2 polygons with same number — pending CLE renumber"*. The UI displays the bare lot number (`{lot.lotNumber}`) without the suffix — so two adjacent tiles render visually identical and the second tap appears to "miss". | **Low** (data-pipeline issue with known external dependency) |
| 6 | **"About F2K ↗" is the only link to who-we-are, and it opens an external site in a new tab.** Megan: *"on a phone that means I now have two tabs and Safari's tab pile is a graveyard. I never went back."* | `src/components/ProjectsHeader.tsx` has the `About F2K ↗` external link. There is no inline "who we are" page on this domain. | **Medium** (information-architecture — not strictly a bug, but the single biggest cited IA mistake) |
| 7 | **Tap targets on the 145-lot Seafields plan are too small on a 390px iPhone viewport.** | `src/components/seafields/SiteMap.tsx` renders polygons as SVG paths scaled to the viewport — at 390px wide, 145 lots distributed across the plan means each lot tile is well under the 44×44px iOS HIG / WCAG 2.5.5 minimum. Pinch-zoom is the only fallback. Violates the global RESPONSIVE DESIGN RULE in `~/.claude/CLAUDE.md` (tap targets ≥44×44px on mobile). | **Medium** |
| 8 | **"POA" in Seafields key stats is unclear to a first-home buyer.** Megan: *"POA means 'price on application' but a first home buyer might not know that — and right next to it there's 'From Q3 2026' for Stage 1 release. So I see POA and think it's a date."* | `src/app/(public)/seafields-estate/page.tsx` line 97: `{ value: "POA", label: "Land pricing" }` | **Low** (1-character copy change) |
| 9 | **"LOCKED" labels on Stages 2–7 sound like access denial, not "coming next".** | `src/app/(public)/seafields-estate/page.tsx` lines 196–202: every stage row reads `state: "LOCKED"`. The CSS treatment is correct (greyed out), the word choice is the issue. | **Low** (copy-only) |
| 10 | **"Interested / Reserved" heat-map legend visible on Seafields plan even when no lot has any registrations** — looks like a feature that hasn't started working. Megan saw the legend with zero matching states displayed. | `src/components/seafields/SiteMap.tsx` renders the legend unconditionally. | **Low** |
| 11 | **Buyer-type dropdown puts "First Home Buyer" below "Investor" options on Seafields.** Megan: *"the option order makes me look like I'm last on the priority list."* | `src/components/seafields/RegistrationForm.tsx` lines 54–61: `BUYER_TYPES = ["First Home Buyer", "Next Home Buyer", "Downsizer", "Investor — Owner Occupier", "Investor — Rental / SMSF", "WACHS / Government Staff"]`. Actually already correct on Seafields. Need to check Branscombe ordering. **Pre-fix verification required.** | **Low** (5-line reorder) |
| 12 | **Branscombe Type 1A vs 1B (and 2A/2B/2C) difference is not explained anywhere on the page.** Both are 104m², both 3-bed 2-bath, both listed for different unit numbers. Megan: *"Why are they different types? Mirrored floor plans? Different colour scheme by default? I'd need to know that before I 'select' one."* | `src/app/(public)/branscombe-estate/page.tsx` lines 211–238: type-summary cards list size+deck+units but no differentiator. Need to confirm whether the architectural difference (mirror, orientation, garage handedness) lives somewhere in `src/data/branscombe/` and surface it. | **Medium** |
| 13 | **Floor-plan zoom on mobile is awkward.** Clicking Type 1A opens the image fullscreen but pinch-zoom is fiddly and room labels are unreadable. | `src/components/branscombe/FloorPlanGallery.tsx` — needs verification of the lightbox/modal behaviour. A "Download PDF" link beside each plan would be the simplest path. | **Low** |
| 14 | **Unit selection on Branscombe site map silently deselects on accidental tap.** Megan tapped Unit 19, then accidentally tapped Unit 20, lost her selection of 19 with no warning. | `src/components/branscombe/SiteMap.tsx` — toggle behaviour. Either confirm-before-replace, or allow multi-select with explicit per-tile remove. | **Low** |
| 15 | **Hemp Homes price ($150k–$210k for 60m²) is buried in the FAQ four-fifths down the page.** Megan: *"the page literally answers the question we always ask ('but what does it actually cost me') and then hides the answer."* | `src/app/(public)/hemp-homes-for-eco-communities/page.tsx` — needs surgical reorganisation. | **Medium** (Hemp Homes is the lowest-conversion-priority of the three projects, but if we're touching the page, fix this in the same pass.) |
| 16 | **Hemp Homes hero copy assumes the reader is already in an eco-community.** Q04 of the FAQ contradicts this. | Same file. Hero rewrite to lead with built-for-you (more common case), then eco-community option below. | **Medium** |
| 17 | **Hemp Homes hero image is the Koala70 "placeholder" honesty plate.** Megan appreciates the transparency but: *"a property page where the hero image is 'a different building, sorry' is hard to share with my husband."* | `src/app/(public)/hemp-homes-for-eco-communities/page.tsx` lines around 150 uses `koala70-placeholder-exterior.png`. Replace the *bare image* with a labelled "Coming soon — engineering render in development" plate so the page doesn't look like a wrong upload. | **Low** |
| 18 | **No "what happens after I register" line on any project page.** Megan: *"I've been burned once by a registration black hole."* | After-submit success screen on each form does say *"A confirmation has been sent to {email}"* but the pre-submit page does not promise this anywhere. Add a 1-line "After you register: Dennis personally replies within 2 business days" expectation-setting line. | **Medium** |

---

## 2. Critical — Photos on every project page

**Outcome:** every project card on the homepage shows a hero photograph (not a technical drawing); every project page has a dedicated photo gallery section above the registration form. No registrant will be asked to "select a home" without having seen what one looks like.

### 2.1 Seafields — the hardest one (no real photos exist)

`public/seafields/` contains only `masterplan.jpg`, `site-plan-hires.jpg`, `site-plan.jpg`, and the DA PDF. There is no photograph of a built F2K home, no render of a Seafields lot, nothing.

**Options, ranked:**
1. **Best:** commission three architectural renders of a Factory2Key modular home dropped onto a Seafields-like lot (front elevation, rear/deck, kitchen interior). This is a Dennis decision — render-pack price typically $1.5k–$3k depending on supplier. Place these as `/public/seafields/render-front.jpg`, `render-rear.jpg`, `render-interior.jpg`. Add a "Render — indicative finishes" caption per the same honesty-disclaimer pattern used on Hemp Homes.
2. **Bridge:** reuse the Branscombe `home-exterior-1.png` / `photo-front.png` / `photo-rear.png` / `photo-side.png` on Seafields as "Example Factory2Key build (Branscombe Estate, TAS)". Cheaper, immediate, and Megan's comment — *"Are there prior projects somewhere? Built homes I could drive past?"* — was literally asking for this. Caption must be explicit ("This is a Branscombe home, shown to illustrate F2K modular finishes") to avoid implying it's a Seafields photo.
3. **Worst:** ship a "Photos coming soon" placeholder. Don't.

**Recommendation:** ship option 2 immediately, commission option 1 in parallel and swap when renders arrive.

**Files to touch (no code yet — for the implementation pass):**
- `src/app/(public)/seafields-estate/page.tsx` — add a `Gallery` section between the Hero (line ~88) and Key Stats, or between About (line ~175) and Staging (line ~178).
- `src/app/(public)/page.tsx` line 13 — homepage card `image: "/seafields/masterplan.jpg"` becomes `"/seafields/hero-render.jpg"` (or the chosen bridge image).
- Reuse the existing `FloorPlanGallery` lightbox component pattern from Branscombe (`src/components/branscombe/FloorPlanGallery.tsx`) for the new Seafields gallery — don't reinvent.

### 2.2 Branscombe — photos exist but are not displayed

`public/branscombe/` contains `home-exterior-1.png`, `home-exterior-2.png`, `home-exterior-3.png`, `photo-front.png`, `photo-rear.png`, `photo-side.png`. Today the page uses *only* `home-exterior-1.png` as the video poster (line 179) and nowhere else. **The photos are sitting unused.**

**Action:** add a dedicated photo gallery section to the Branscombe page, immediately below the video flyover (line ~193) and above the House Types section (line ~196). 6-image grid (3 exteriors + 3 detail photos), lightbox on click using the same pattern as `ElevationGallery`/`FloorPlanGallery`. Section header: "What a Branscombe Home Looks Like" or similar.

**Files to touch (for the implementation pass):**
- `src/app/(public)/branscombe-estate/page.tsx` — insert new `<section>` between video and house-types, mounting a new `<PhotoGallery />` component.
- `src/components/branscombe/PhotoGallery.tsx` — new file, modelled on `ElevationGallery.tsx`. Lazy-load images, lightbox on click.
- `src/app/(public)/page.tsx` line 25 — homepage card already uses `home-exterior-1.png`. Keep.

### 2.3 Hemp Homes — replace bare placeholder with labelled render plate

`koala70-placeholder-exterior.png` already exists and is being used. The problem is not the image itself, it's that it's shown bare without enough framing.

**Action:** wrap the image in a captioned plate with explicit framing: *"Architectural render in development — image above is the Factory2Key Koala70 (an earlier modular model) shown only to illustrate construction approach. The Joey60 Hemp Edition render will replace this image when complete."* Use a soft `bg-amber-50/border-amber-200` info-panel under the image (same pattern as `lot.geometryPending` block in the seafields registration form).

---

## 3. High — Price on Branscombe

**Outcome:** every project page surfaces a real or indicative price within the first viewport on mobile. No buyer should have to scroll three times looking for a dollar figure.

### What to add

A **"From $XXX,XXX (indicative)"** stat in the KEY STATS row, mirroring the pattern Seafields already uses ("From $150,000 land / From $485,000 H&L"). Even if Dennis isn't ready to commit to a precise number, the range bracket is the conversion-critical piece.

**Need from Dennis before implementation:**
- A rough range for each home type. Options:
  - Single page-wide range: e.g. *"Homes from approximately $XXX,000 to $XXX,000"* — easiest.
  - Per-type range: 1A/1B (104m²) from $X, 2A/2B/2C (114m²) from $Y. More honest, fits the existing type-card UI.
- The disclaimer copy to attach: e.g. *"Indicative pricing — final contract pricing will be confirmed at construction commencement (Q1 2027)."*

### Files to touch (for the implementation pass)

- `src/app/(public)/branscombe-estate/page.tsx` lines 87–109 — add a 6th stat to the grid (or replace the 5-stat layout with 6, adjusting `md:grid-cols-5` → `md:grid-cols-6`).
- Same file lines 211–238 — add `price: "$XXX,000"` to each type-summary card, displayed below `3 bed · 2 bath`.

---

## 4. High — Fix the video codec / fallback issue

**Outcome:** the aerial flyover loads and plays on iOS Safari, OR the poster image renders cleanly even if the video can't be played, OR the section degrades to a captioned still image without ever showing the literal text *"Your browser does not support the video tag"*.

### Investigation order before any fix

1. **Verify the Supabase signed URL is reachable from iOS Safari.** The URL token in the source has `iat: 1773130557 / exp: 1835338557` — that's ~2 years of validity. Use the `/browse` skill on iPhone viewport to confirm the URL returns 200 and the right content-type. If the URL is dead or rate-limited, the poster image should have shown — which means there's a *second* problem.
2. **Verify the poster image (`/branscombe/home-exterior-1.png`) renders standalone on the page.** If the poster works elsewhere on the page but not in the `<video poster=...>` slot, the issue is iOS Safari's video-element rendering, not the asset.
3. **Verify the MP4 codec.** iOS Safari requires H.264 baseline/main profile (not HEVC) for inline playback. If the source video uses HEVC or VP9, Safari won't decode it. Use `ffprobe` on the source file (or whatever's behind the signed URL) to confirm.

### Fix options, ranked

1. **Fallback element with explicit poster fallback inside the `<video>`.** Replace the literal fallback text with an `<img>`:
   ```tsx
   <video controls playsInline muted preload="metadata" poster="/branscombe/home-exterior-1.png">
     <source src="..." type="video/mp4" />
     <img src="/branscombe/home-exterior-1.png" alt="Aerial flyover preview — 122–124 Branscombe Rd" />
   </video>
   ```
   This way, even on browsers that can't decode the source, an image displays instead of plain text.
2. **Re-encode the video for iOS compatibility.** `ffmpeg -i input.mp4 -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -c:a aac -movflags +faststart output.mp4`. Then re-upload to Supabase storage and update the source URL. This is the "correct" fix if §4-investigation step 3 reveals the codec is wrong.
3. **Move the video out of Supabase Storage and into the project's `public/branscombe/flyover.mp4`** (the file already exists at `public/branscombe/flyover.mp4` — 79MB — verify). Serving from the Next.js static asset path eliminates the signed-URL/CORS dimension entirely.
4. **Add `muted` to the video element.** iOS Safari requires `muted` + `playsInline` for auto-thumbnail generation. Without `muted`, the poster doesn't always render until the user taps play.

**Recommendation:** ship fix #1 (`<img>` fallback inside `<video>`) immediately — it's a 3-line change and guarantees no "Your browser does not support the video tag" text ever shows. Then run investigation steps and apply #2/#3/#4 as needed.

### Files to touch (for the implementation pass)

- `src/app/(public)/branscombe-estate/page.tsx` lines 174–188.

---

## 5. Medium — Reduce registration form to ~6 fields

**Outcome:** a first-home buyer who landed on the page at 11pm can register their interest in 60 seconds with their thumb, on their phone, without 18 dropdowns.

### Two-tier form pattern (recommended approach)

Megan's exact suggestion: *"a two-field 'express interest' shortcut at the top of every project page (email + selected home/lot) that lets warm leads opt in with one tap, and full form for people ready to share more."*

**Tier 1 — "Express Interest" (default visible, 6 fields):**
1. First name (required)
2. Last name (required)
3. Email (required)
4. Phone (optional but encouraged)
5. Purchase timeline dropdown (5 options — already exists)
6. Selected home/lot (already populated from interactive map)
7. Consent checkbox (legal requirement — not counted toward the "6 fields" promise but always shown)

**Tier 2 — "Tell us more (optional)" (collapsed, expand-to-show):**
- Suburb / postcode
- Buyer type ("First Home Buyer" / "Next Home Buyer" / ...)
- Buyer profile ("Young Family" / "Couple" / ...)
- Current housing
- Finance status
- How did you hear about us
- Referrer block (type, name, company, contact)
- Notes / questions
- Price preferences per lot (the multi-step lot-detail panels stay where they are — they're not "form fields" in the conversion sense, they're product configurators)

### Buyer-type dropdown reorder (separate small fix)

Move "First Home Buyer" to the top of the `BUYER_TYPES` array in both `RegistrationForm.tsx` files. **Pre-fix check:** Seafields already has "First Home Buyer" at index 0 (confirmed in `src/components/seafields/RegistrationForm.tsx` lines 54–61). Megan's complaint was specifically about Branscombe — confirm and fix there.

### Remove-from-selection affordance

Megan: *"there's no 'remove this selection' button next to each entry — I'd have to scroll back up and tap the home again. Tiny friction."*

Both forms already have a "Click any lot to remove it" hover prompt in the selected-lots summary card (see `src/components/seafields/RegistrationForm.tsx` lines 388–391, similar in Branscombe). The remove-on-click works but isn't discoverable enough. Add an explicit `×` close-icon button per selected entry (already partially present — the `&times;` at line 416 — promote to a tappable target with `aria-label="Remove lot"`).

### Files to touch (for the implementation pass)

- `src/components/seafields/RegistrationForm.tsx` — restructure form into Tier 1 (always visible) and Tier 2 (collapsed `<details>` or "+ Tell us more" button).
- `src/components/branscombe/RegistrationForm.tsx` — same restructure. Plus the buyer-type reorder if confirmed.
- API endpoints `src/app/api/seafields/register/route.ts` and `src/app/api/branscombe/register/route.ts` — already accept all fields as optional except first_name/last_name/email/consent (verify against current schema in `supabase/migrations/0001_purchaser_schema.sql`); no schema change needed if optional columns are already nullable.

---

## 6. Low — Lot-number duplicates

**Outcome:** Lot 348a/b and 294a/b in the Seafields plan are visually distinguishable from each other in the UI, so a tap on either tile selects the correct one and no buyer ever experiences the "I clicked Lot 348 and Lot 348 didn't select" phantom.

### Root cause (already known, already documented)

`src/data/seafields/lots.ts` line 10 already documents this: *"Lots 294a/b, 348a/b: DWG has 2 polygons with same number — pending CLE renumber"*. CLE (the town planner) hasn't yet renumbered the amended subdivision. The duplicates are a faithful reflection of the source DWG, not a UI bug — but the UI's choice to display only `lot.lotNumber` makes them visually identical.

### Fix options

1. **Display `lot.lotNumber + idSuffix` when `idSuffix` is set** — show "348a" and "348b" in the lot badge. The data structure already has `idSuffix: "a" / "b"`. Two-line change in the badge component.
2. **Show a tooltip on the duplicated lots** explaining *"Lot numbering pending final CLE renumber — register either; we'll confirm the final lot number with you in writing."* Megan flagged that she trusts the site *more* when it's upfront about uncertainty.
3. **Wait for CLE to renumber.** External dependency. Don't gate the fix on this.

**Recommendation:** ship #1 + #2 together. The tooltip leverages the `pendingRenumber: true` flag that's already on the data.

### Files to touch (for the implementation pass)

- `src/components/seafields/LotBadge.tsx` — render `{lotNumber}{idSuffix ?? ""}`.
- `src/components/seafields/SiteMap.tsx` and/or `LotInfoCard.tsx` — show the pending-renumber tooltip on hover/tap.

---

## 7. Bundled lower-priority items worth picking up in the same pass

These are not "ship-blockers" individually, but each costs <30 minutes and all of them were called out by name in Megan's report. Group them into the same PR as the bigger fixes:

- **§ 7.1 "POA" → "Price on enquiry"** in Seafields key stats (line 97). 1-character copy fix that eliminates a confirmed confusion.
- **§ 7.2 "LOCKED" → "Coming next"** on Stages 2–7 in Seafields (lines 196–202). Copy-only.
- **§ 7.3 Hide the heat-map legend when no lots have registrations.** `src/components/seafields/SiteMap.tsx` — conditionally render based on `lots.some(l => l.interestCount > 0)`.
- **§ 7.4 Inline a "Who we are" page on this domain** to kill the cross-domain `About F2K ↗` bounce. Single new route `src/app/(public)/about/page.tsx` mirroring the key positioning copy from factory2key.com.au, with a "Read more on factory2key.com.au ↗" link at the bottom. Update `ProjectsHeader.tsx` to link to `/about` instead of the external site.
- **§ 7.5 "Talk to Dennis" badge top-right of every page.** A small persistent CTA in `ProjectsHeader.tsx` linking to `mailto:dennis@factory2key.com.au` and `tel:+61402612471` — the human-trust signal Megan asked for explicitly.
- **§ 7.6 Soften the disclaimer banner styling.** Current `bg-[#1A2744]` reads as a navy warning sticker. Megan suggested *"white text on muted green with a small lock icon"*. Calmer styling preserves the same legal message without the warning-sticker feel.
- **§ 7.7 "After you register" expectation-setting line** on every form. One line above the consent checkbox: *"After you register, Dennis personally replies within 2 business days. No automated funnels, no follow-up spam."* Megan: *"I've been burned once by a registration black hole."*
- **§ 7.8 "Compare" view across the three projects.** A one-row summary table on the homepage (or a `/compare` route) with columns: name / state / price / timeline / status. Megan: *"I'd love a one-screen 'what fits my budget and timeline' matrix."* Probably its own follow-up PR, not part of this one.
- **§ 7.9 "PDF download" link beside each Branscombe floor plan** to fix the mobile zoom-on-image friction.

---

## 8. Out of scope for this remediation

These were raised in Megan's report but require separate planning and are NOT part of this pass:

- **Tap-target rework of the 145-lot subdivision plan for mobile** (Finding #7). This needs a fundamentally different interaction — list-first/filter-first selection on mobile, not the current pan-and-zoom SVG. That's a discrete design-and-engineering task, not a polish item. File a separate ticket per the global RESPONSIVE DESIGN RULE in `~/.claude/CLAUDE.md`.
- **Customer-stories / social-proof section.** Megan flagged this as the thing she wanted most to find. No prior F2K projects have built homes with capture-ready customer stories yet. This is content-acquisition work, not site work.
- **FAQ section for Seafields and Branscombe** ("is modular slower / more expensive / bank-loanable / can I bring my own builder for fit-out"). Worth doing — but content-first, not engineering-first. Compose the FAQ copy with Dennis in a separate session, then ship.

---

## 9. Recommended implementation order

If Dennis approves the whole plan, sequence the work as follows. Each phase is independently shippable.

| Phase | Scope | Estimated effort | Ship before |
|-------|-------|------------------|-------------|
| **Phase 1 — Trust unblockers** | §3 (Branscombe price), §4 (video fallback), §6 (lot-number suffix display) | 1 dev-day | Next public link share |
| **Phase 2 — Photos** | §2 (all three projects — Branscombe gallery from existing assets, Seafields bridge from Branscombe photos, Hemp Homes captioned placeholder) | 1–2 dev-days | Next paid traffic push |
| **Phase 3 — Form reduction** | §5 (two-tier form on both Seafields and Branscombe, plus buyer-type reorder, plus per-lot remove button) | 1 dev-day | Before any conversion-rate measurement |
| **Phase 4 — IA + copy polish** | §7.1 – §7.7 bundled | 0.5 dev-day | Bundled with Phase 1 or 2 |
| **Phase 5 — Hemp Homes restructure** | §1 finding #15 / #16 / #17 (price up-front, hero rewrite, captioned placeholder) | 0.5 dev-day | Whenever Hemp Homes campaign starts |
| **Out of scope** | Mobile lot-selection rework (§8), customer stories (§8), FAQ (§8), compare-view (§7.8) | Separate planning | — |

---

## 10. Sign-off gate

Before any implementation starts, Dennis needs to decide on:

1. **§2.1** — option 1 (commission renders, ~$1.5k–$3k) vs option 2 (bridge from Branscombe photos with explicit captions) for Seafields visuals. **Recommendation: option 2 now, option 1 in parallel.**
2. **§3** — the specific price range to surface on Branscombe. Single page-wide bracket or per-type? What number?
3. **§7.4** — green-light inlining a `/about` page on `f2k-projects.vercel.app` (yes/no) vs leaving the cross-domain bounce in place.
4. **§7.6** — green-light the softer disclaimer-banner styling (yes/no, or keep the navy).
5. **§7.7** — confirm the "Dennis personally replies within 2 business days" promise is one that operationally holds. If not, soften the copy.

Until those five are answered, this remains a plan-only document. Once answered, the implementation phases above are ready to start.

---

*Authored by: Claude Code (read-only analysis, no schema or code changes)*
*Source: naive-tester walkthrough by "Megan" persona, 25 min on iPhone Safari, 2026-05-19*
*Standard: NAIVE_TESTER_REMEDIATION template — `~/.claude/CLAUDE.md` workflow contract applies on implementation.*
---

## 2026-05-20 Re-sweep addendum (cheap-probe)

**Date:** 2026-05-20  
**Method:** automated HTTP probe (curl-equivalent) of root + 3 key routes (see `cais-shared-services/probe-roster-2026-05-20.json`)  
**Full portfolio brief:** `cais-shared-services/PORTFOLIO_NAIVE_RESWEEP_2026-05-20.md`

**Re-test result:** 🟡 AMBER

- Root: HTTP `200`
- Title: `Factory2Key Projects — Australian Housing Developments` (yes)
- Key routes resolving: **0/3**
- Broken: `/seafields` (404), `/branscombe` (404), `/hemp-homes` (404)

**BYOK-ready determination:** **NO — persona findings + plumbing gaps still standing**

**What this re-test can and cannot say:**

- ✅ It confirms the URL plumbing reachable from a 2026-05-20 curl.
- ❌ It cannot verify the persona-level findings in this doc — copy quality, trust signals, CTAs that return 200 but go nowhere, RLS holes behind 200 auth pages.
- The persona findings above remain authoritative until each is individually re-tested.

<!-- /resweep-2026-05-20 -->
