# Mobile Marcus — Seafields Employer Accommodation (take-or-pay)

**URL:** https://f2k-projects.vercel.app/seafields/employers
**Device:** iPhone SE emulation, 375px wide, portrait, 2x scale, touch on
**Date:** 2026-06-15
**Tester:** Mobile Marcus (phone-only, fat thumbs, dodgy reception, low patience)
**Screenshots:** `./naive-tester-reports/2026-06-15-employers/mobile-marcus/`

---

## TL;DR

Honestly? This thing mostly *works* on my phone, which is more than I can say for half the sites I try to fill out between jobs. The fork is two big fat cards I can actually hit with my thumb, the form filled in fine, and it told me my interest was registered with my actual business name in the message. Morgan the chatbot popped up and even answered my "how does take-or-pay work" question.

BUT — there's one ugly thing: **as soon as I tap "Rent it", the page scrolls sideways.** I can drag the page left and there's a dead 44px strip of nothing on the right. That's the Morgan box hanging off the edge. On a phone, sideways scroll on a form page makes me think the site's broken. That's my one real gripe.

---

## Section 1 — Landing / the fork
*(screenshot: 01-landing-375.png)*

Opens clean. Tab title reads **"Local employer accommodation — Seafields | Factory2Key"** — proper name, not "Create Next App". Good.

The header tells me what this is straight away: *"Stop flying your team in and out."* then a paragraph explaining many roles around Seafields only FIFO because there's nowhere to live, and I can secure staff accommodation two ways. That's the what / why / what-to-do covered. Readable on the small screen.

Then the fork — **"How do you want to secure staff accommodation?"** — two stacked cards:
- **Own it** → "Go to buyer registration →"
- **Rent it (take-or-pay)** → "Choose take-or-pay →"

Both cards measured **335 × 174px**. That's a *massive* tap target — no way I'm fat-thumbing the wrong one. Nice. No sideways scroll on the landing (scrollWidth = innerWidth = 375).

**Opportunity:** the card *body* text and the "Choose take-or-pay →" / "Go to buyer registration →" link text are only **14px**. I had to squint a touch. Bump those to 16px and it reads cleaner on a phone.

---

## Section 2 — "Rent it (take-or-pay)" → the form
*(screenshots: 02-rent-form-375.png, 03-morgan-overflow-375.png)*

Tapping the "Rent it" card opens the take-or-pay form *inline*, right below the fork — no page jump, no new tab. Good, no dead end. The card relabels to "Selected — form below". Smart.

**THE BUG:** the instant the form opens, the page gains **44px of horizontal scroll** (scrollWidth 419 vs viewport 375). I confirmed it three times on a clean 375px viewport. The culprit is the **Morgan voice panel** (`.convai-panel--embedded`): it's pinned at left:44px but forced to a full 375px width, so its right edge lands at 419 — 44px off the screen. On a phone this means the whole page rubber-bands sideways. Looks broken even though the form works.

The form itself ("**Reserve staff beds — take-or-pay**") has a header explaining what it is. Fields:
- Business name* (text)
- ABN (11-digit)
- Contact name*
- Contact email*
- Contact phone
- Staff accommodation count ("e.g. 8")
- "What you'd reserve" — radio: **Whole house(s)** (pre-selected) / By the room
- How many whole houses (number)
- Commitment term (select: 6 / 12 / 24 / 36 months)
- Required start date (date picker)
- FIFO roles (textarea — "helps us show funders the demand is real")
- Checkbox: "We'd also consider buying..." (optional)
- Checkbox: "I understand this is a registration of interest..." (REQUIRED)

Selects and the native date picker both worked fine with thumb taps. Submit button **"Register take-or-pay interest"** is 285 × 48px — easy to hit.

---

## Section 3 — Morgan the voice/chat agent
*(screenshot: 04-morgan-launched-375.png)*

Reached Morgan in **2 taps** (Rent it → "🎙️ Start a conversation"). The launch button is **214 × 44px, 16px text** — fine for a thumb. It opened an embedded chat panel with an avatar and a text input ("Type your question" + Send). No console errors. I asked how take-or-pay works and Morgan actually answered — explained I'd commit to paying for a set number of beds whether or not they're full, and that the guaranteed revenue de-risks the build. Genuinely useful, not a dead button.

**Catch:** Morgan's panel is the *same* element causing the 44px sideways overflow above. So the one feature that's supposed to help me is also the thing breaking my layout. The input box and Send button stay on-screen, but the panel chrome bleeds off the right edge.

---

## Section 4 — Validation + submit
*(screenshots: 05-missing-consent-375.png, 06-submitted-375.png)*

Tried submitting with the required consent box unchecked → blocked with a clear browser message **"Please check this box if you want to proceed."** Good, it doesn't let me skip it.

Checked the box, filled everything with throwaway details (Marcus Ute Services Pty Ltd, fake ABN, marcus.throwaway@example.com, 8 staff, 4 houses, 12 months, Sept start), submitted → **success**. Message:

> *"Interest registered — Thank you. We've recorded Marcus Ute Services Pty Ltd's take-or-pay interest for Seafields staff accommodation. Dennis will be in touch to size the demand and walk through the commercial terms. This was a registration of interest only — it creates no obligation on either side."*

Personalised with my business name, tells me what happens next, reassures me there's no obligation. That's a proper confirmation, not a blank screen. No console errors. (The 44px overflow is still there on the success state because Morgan's still rendered.)

---

## Section 5 — "Own it" path
*(screenshot: 07-own-it-destination-375.png)*

Tapped "Own it" once. Redirects to **`/seafields-estate?ref=employer`** — the full Seafields Estate buyer page, with a `ref=employer` tag on the URL (nice, they're tracking where I came from). The destination has **no horizontal scroll** at 375px and is a sensible buyer landing (lot pricing, home designs, "Pick a Lot Above to Begin"). The redirect works cleanly on mobile.

---

## Section 6 — Navigation
*(screenshot: 08-nav-drawer-375.png)*

The top bar collapses to a hamburger ("Open menu") at **exactly 44 × 44px** — reachable top-right with a thumb. Tapping it surfaces 7 nav items (Projects, Seafields, Branscombe, Hemp Homes, For Developers, Blog, About F2K).

**Opportunity:** those drawer items are only **36px tall** each — under the 44px minimum. Stacked close together, I'd occasionally tap the neighbour. Give them more vertical padding.

---

## Concrete bug list (with numbers)

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | ❌ **BLOCKER** | **44px horizontal scroll** appears when the take-or-pay form opens. Cause: `.convai-panel--embedded` (Morgan) is left:44 + width:375 → right edge 419 at a 375px viewport. Persists on the success state. | scrollWidth 419 vs innerWidth 375, reproduced 3× clean |
| 2 | ❌ | Body/CTA text **14px** on the fork cards and "Choose take-or-pay →" / "Go to buyer registration →" links (below 16px min) | computed font-size scan |
| 3 | ⚠️ | Eyebrow / banner / footer text **12px** ("Registration of interest only", "Seafields · Local employer accommodation", copyright) | computed font-size scan |
| 4 | ⚠️ | Mobile nav drawer items **36px tall** (below 44px touch min) — collision risk | getBoundingClientRect on drawer links |

Everything else (fork cards 335×174, hamburger 44×44, Morgan launcher 214×44, submit 285×48) clears the 44px bar comfortably.

---

## Standards Check (responsive focus)

- ✅ **§7 Scaffold metadata** — tab title is "Local employer accommodation — Seafields | Factory2Key". Real product name.
- ✅ **§5 Explanatory header** — opens with what/why/what-to-do ("Stop flying your team in and out…"), readable at 375px.
- ✅ **§6 Voice agent** — Morgan reachable in 2 taps, launcher 214×44px @16px, opens, connects, answers a real take-or-pay question, no console errors. *(But see §1 finding — its panel is what overflows.)*
- ✅ **§9 Codicils — no dead ends** — fork → inline form → personalised success; "Own it" redirect works on mobile (`?ref=employer`); required-consent validation blocks bad submits with a clear message.
- ❌ **§1 Responsive — horizontal scroll** — 44px h-scroll at 375px once the take-or-pay form opens (Morgan panel overflow). This is the headline blocker.
- ❌ **§1 Responsive — text ≥16px** — fork card body + both CTA links at 14px; eyebrow/banner/footer at 12px ("I can't read this" without squinting).
- ❌ **§1 Responsive — touch targets ≥44px** — mobile nav drawer items at 36px tall.
- ✅ **§1 Responsive — primary targets** — fork cards (335×174), hamburger (44×44), Morgan launcher (214×44), submit (285×48) all ≥44px; form usable with a thumb.
- ✅ **§1 Responsive — landing/form/success layout** — no h-scroll on the landing or the "Own it" destination; reflows to single column.

---

## Scope note

I only walked `/seafields/employers` and the one redirect target (`/seafields-estate?ref=employer`), as a phone-only user at 375px. I did not test desktop/tablet widths, did not log in (none needed), and used throwaway details. I did not read any product source, docs, or memory — only the live URL. The standards rubric is my own quality bar, not the product's documentation. The desktop-width renders that appeared in a couple of full-page screenshots (03, 08) were a browser-viewport-reset capture artifact, not the real mobile state — all px measurements above were taken on a confirmed clean 375px viewport.

---

That one sideways-scroll thing aside, this is one of the better forms I've filled out from the front seat of a ute. Fix Morgan hanging off the edge and bump the small text and I'd have nothing to complain about.

— Marcus
