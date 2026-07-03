# Mobile Marcus — Dutton Terrace Estate (phone walkthrough)

- **URL:** https://f2k-projects.vercel.app/dutton-terrace-estate
- **Device:** phone, 375×812 viewport (iPhone-ish), one thumb, couch, dodgy regional signal
- **Date:** 2026-06-17
- **Persona:** regional buyer browsing on my phone. I pinch-zoom anything small and I complain about it. Fat thumbs.

---

## TL;DR

It's a nice-looking page on the phone. Nothing runs off the side of the screen (I checked the whole way down — no annoying sideways scroll, which is the thing that usually drives me mad on a phone). The big stuff is big: the headline, the maps, the photos, the "Register" button. The hamburger menu is clean and easy to thumb.

But two things annoyed me as a real phone user, and one thing I went looking for and couldn't find:

1. **Half the text I actually wanted to read is too small.** The "Living in Tumby Bay" town cards (schools, hospital, the jetty) are 14px, and the little grey helper notes on the form are 12px. I had to pinch-zoom to read them. If you're selling me on the *town*, don't make me squint at the bit about the school.
2. **That black "Report a problem — get it SayFixed" bar floats over the page and lands on top of things I'm trying to tap.** It sits over the hero "Register Your Interest" button, and lower down it parks itself right on top of a form dropdown. Fat-thumb hell.
3. **There's no "talk to someone" / voice helper anywhere.** Other property pages I've seen had a little chat or voice thing. Here, nothing. If I had a question mid-form, my only option is the footer email.

Would I register? Yeah, probably — the form works and the button's big. But fix the tiny text and move that floaty bar.

---

## Section by section

### Hero — 👍
Loads fast even on my patchy signal. "Dutton Terrace" headline is huge and clear. The subhead ("A proposed master-planned community — ~40 family homes alongside a childcare centre and an aged-care facility") tells me exactly what this is in one breath. "Tumby Bay · South Australia (Eyre Peninsula) · 6.3 ha" right underneath — good, I know *where* immediately. The explanatory paragraph ("at an early concept stage... no deposit, no commitment") is honest and 16px, easy to read.

The little eyebrow above the headline — "A FACTORY2KEY PROJECT · CONCEPT STAGE" — is 12px and letter-spaced wide, so it's faint. Minor, it's just a label.

Up top there's a dark "REGISTRATION OF INTEREST ONLY — no deposit is required or accepted" banner. Good that it's honest, but it's the smallest text on the page and it's three lines on my screen. I read it, but only because I squinted.

### Sticky header / nav — 👍 (with a note)
F2K logo top-left, hamburger top-right — exactly where my thumb expects it, easy 44px tap. Tapping it slides out a tidy drawer: **Projects**, then grouped by state (Western Australia → Seafields, South Australia → Dutton Terrace, Tasmania → Branscombe, Multi-State → Hemp Homes), then For Developers / Blog / About F2K. Big, well-spaced rows, no mis-taps. This is how mobile nav should work.

**Note:** the sticky header is *tall* — the registration banner AND the logo bar both stay stuck, eating about 140px (a sixth of my screen) the whole time I scroll. Not broken, just a bit greedy on a small screen.

### Stats / "A community designed around how people actually live" — 👍
Clear heading, the development facts (address, ~40 single-family residential, the Residential/Childcare/Aged-care mix, the legal lot description, "Unzoned — rezoning to be progressed", "Concept · site assessment underway") are laid out fine and reflow into a single column. No overflow.

Some of these fact rows are 14px though — borderline. Readable but I'd bump them.

### The maps — 👍
Two maps and both behaved well on the phone:
- **"Where Dutton Terrace sits in South Australia"** — a context map showing the Eyre Peninsula with a pin, Adelaide/Whyalla/Port Augusta for reference. Great for orienting a buyer who doesn't know the area. Scales to the column, no overflow.
- **The corrected satellite allotment map** ("Dutton Terrace, Tumby Bay — indicative extent") — the site outlined in a teal dashed boundary, street labels (Church St, Spencer, Pearl Tce, Dutton Tce, Bullock Tce), a location pin, "INDICATIVE EXTENT" banner. Looks sharp. The street labels are small but that's a satellite photo, fair enough.

I tried to pinch-zoom them — they're images, so pinch just zooms the page, which is fine for getting a closer look. No broken/overflowing map canvas. Maps © Mapbox caption underneath is 12px (tiny, but it's an attribution line, nobody reads those).

### "Living in Tumby Bay, Eyre Peninsula" — 👍 looks / 👎 text size
The panorama strip is lovely — a full-width foreshore shot with "TUMBY BAY FORESHORE" over it, runs the full width of my screen with no overflow. The two lifestyle photos (the turquoise jetty water, the main street) are clean and scale to the column.

The four town-info cards — **Getting there / Schools & childcare / Health & services / Recreation & lifestyle** — are genuinely useful (this is the bit that sells me on living here). **But the body text in them is 14px.** "Tumby Bay Hospital, a pharmacy and...", "A historic jetty — a renowned leafy...", "Tumby Bay Area School teaches Reception to..." — I'm pinch-zooming to read the exact stuff that's meant to convince me. **I can't comfortably read this at arm's length.** That's the §16px-mobile rule, and it's the content that matters most here.

### "More than a subdivision" (the masterplan mix) — 👍
Three cards — Residential / Childcare Centre / Aged-Care Facility — stack into one column, big and clear. No issues.

### Register your interest form — 👍 mostly / 👎 floaty bar + tiny helper text
The form is the right shape for a phone: full-width inputs, big labels that wrap (don't truncate), full-width dropdowns. I filled first name / last name / email no problem. Lots of dropdowns (interested in / lot size / budget / I am a / timeframe / finance / how-did-you-hear / referrer type) — all full-width and thumb-friendly.

- **The "Register my interest" submit button is full-width (343×48) and disabled until I tick the consent box** — good, it stops me submitting half a form, and the gate works (I ticked, it lit up).
- **The consent checkbox box itself is tiny (13×20px)** — looks unhittable. BUT the whole consent paragraph is a tappable label (180px tall), so tapping the *text* ticks it. So in practice I can hit it. Still, the little box *looks* like a fat-thumb trap; I'd make the visible box at least 24px so it doesn't read as "good luck hitting that."
- The consent paragraph itself is 16px — good, that's the legally-important one.
- **The grey helper note under "Indicative budget" ("Helps us plan a mix people will actually buy — your budget guides the pricing...") is 12px.** Squint city.

**The annoying bit:** that black **"Report a problem — get it SayFixed"** pill is *fixed* to the bottom of my screen and never goes away (it's pinned with the highest z-index possible, so it's always on top of everything). When I'm in the form it sits **right on top of a "— Select —" dropdown**, and back up in the hero it sits **on top of the "Register Your Interest" button**, covering the words. With fat thumbs I keep hitting the SayFix bar when I'm aiming for the field/button underneath it. On a phone this floaty thing is in the way.

---

## What I went looking for and couldn't find

- **A way to talk to someone / a voice or chat helper.** I had a couple of questions mid-form ("is the childcare definitely happening?") and there was no chat bubble, no voice button, nothing in the header or as a floating helper. The only contact is the footer email/phone. For a page asking me to register interest, give me a quick "ask a question" surface.

---

## Opportunities

- **Opportunity:** Bump all body copy to 16px minimum on mobile — specifically the Living-in-Tumby-Bay town cards (14px) and the form helper notes (12px). That's the content doing the selling; making me pinch-zoom it costs you.
- **Opportunity:** Make the SayFix bar get out of the way on mobile — either dock it so it doesn't overlap interactive elements, shrink it to a small corner bubble, or auto-hide it while a form field is focused. Right now it covers the hero CTA and a form dropdown.
- **Opportunity:** Add a thumb-reachable "ask a question" / voice helper (the kind on the other estate pages) so a curious buyer can ask mid-page instead of bailing to email.
- **Opportunity:** Make the consent checkbox *box* visually bigger (24px+) so it doesn't look like a fat-thumb trap, even though the label is tappable.
- **Opportunity (minor):** The sticky header is 140px tall on a phone (banner + nav both stick). Consider letting the registration banner scroll away after the first screen so more of the page shows.

---

## Standards Check

- §1 Responsive — ✅ **PASS** — No horizontal scroll anywhere (full-document scan = 0 overflowing elements; docW == 375). Single responsive build, everything reflows to one column.
- §1/§3 Touch targets ≥44px — 🟡 **MOSTLY PASS** — Hamburger 44×44, submit button 343×48, dropdowns/inputs all full-width and ≥44px tall. **But** the consent checkbox box is 13×20px (rescued only because the surrounding 180px label is the real tap target). Plus a tap-collision: the fixed SayFix bar (314×42, z-index 2.1B) overlaps the hero CTA and a form dropdown.
- §3 Body text ≥16px — ❌ **FAIL** — Town-info cards 14px ("Tumby Bay Hospital…", "A historic jetty…"); form helper text 12px ("Helps us plan a mix…"); eyebrow/banner/map-caption labels 12px. Decision-driving content is below the mobile 16px floor; had to pinch-zoom.
- §3 Images/maps/panorama scale to viewport — ✅ **PASS** — Both maps 325w, gallery photos 325w, panorama 375w full-bleed; no fixed-width overflow; all have descriptive alt text.
- §5 Explanatory header — ✅ **PASS** — Hero subhead + "at an early concept stage… register to shape the masterplan" reads clearly on mobile; every section has a descriptive heading.
- §6 Voice agent reachable from chrome — ❌ **FAIL** — No voice/chat surface anywhere on the page (no `<elevenlabs-convai>`, no launcher, no FAB, no "talk to" text). DOM probe confirmed absent.
- §7 Browser tab title = product name — ✅ **PASS** — "Dutton Terrace — Register Your Interest | Factory2Key".
- §9 Zero dead ends / register CTA + form thumb-usable — ✅ **PASS (functional)** — Submit full-width, disabled-until-consent gate works, honeypot is the autofill-safe `hp_field` (not a trap). Caveat: the SayFix bar occluding the hero CTA + a dropdown is the one usability snag against this.

---

### ❌ Blocker findings (release-severity)

- **§3 sub-16px body text** — town-info cards at 14px and form helper text at 12px; the copy a buyer reads to decide is below the mobile readability floor.
- **§6 no voice agent** — the page ships with no reachable voice/clarifier surface on mobile (or anywhere).

### 🟡 Strong non-blocker findings

- **Tap-collision:** fixed SayFix bar (z-index 2147483000) overlaps the hero "Register Your Interest" CTA and a mid-form dropdown — fat-thumb hits the wrong target on a phone.
- **Consent checkbox box 13×20px** (visually a fat-thumb trap; tappable label mitigates it).

No horizontal scroll. No sub-44px primary controls. Maps/panorama/gallery all scale cleanly.

— Marcus
