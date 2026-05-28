# Mobile Marcus — Branscombe Estate walkthrough (phone-only, lunch break)

**URL:** https://f2k-projects.vercel.app/branscombe-estate (production, live)
**Device:** my phone, 375px wide (iPhone SE / mini), one-handed, thumbs only.
**Date:** 2026-05-26
**Goal:** browse the homes, peek at a floor plan, find the site map, pick a couple of homes, register my interest end-to-end.

Quick heads-up before the play-by-play: I did get all the way through — picked two homes (U5 and U6) and hit submit, and I got a proper "Thank You for Your Interest!" screen back. So the important thing works. Below is everything I noticed on the way, the good and the annoying.

---

## Hero / landing

First thing on screen is a dark banner: **"REGISTRATION OF INTEREST ONLY — No deposit is required or accepted. Registering does not create any legal or financial obligation."** Love that. As a bloke who gets twitchy about "registering" anything online, you told me up front I'm not signing my life away. That's exactly the right thing to say first.

Then the F2K logo, a hamburger menu top-right, and a clean headline: **Branscombe Estate — 37 architecturally designed, single-storey 3-bedroom, 2-bathroom homes. Claremont, Tasmania — 8km from Hobart CBD.** Then a short paragraph and a big teal **"Select your home →"** button.

- The "Select your home" button is a proper 210×52px — easy thumb target, no missing it. Good.
- Body text is 16px. Readable without zooming. Good.
- No sideways scroll anywhere — the page fits my screen exactly (375 = 375). Good.
- Browser tab says "Branscombe Estate — Register Your Interest | F2K". Not "Create Next App". Tick.
- No console errors, nothing failed to load.

**One niggle:** the hamburger menu icon measures 40×40px. That's just under the 44px I need to hit reliably with a fat thumb — twice I tapped slightly low and caught the edge of the logo instead. Bump it to 44 and I'd never miss.

Opportunity: that hero is doing a lot right; if you A/B'd a single line of "from $X" or "house & land" near the CTA it'd answer the first question every buyer has before they even tap.

---

## Mobile menu (hamburger)

Tapped it (on the second go, see above). It drops down a clean white panel: **Projects, Seafields, Branscombe, Hemp Homes, Blog, About F2K ↗**, with a clear "×" close at top-right. The links are big and well-spaced, the close button is generous. This is a proper mobile menu, not a squished desktop bar. No complaints. Closed it fine.

Opportunity: "Branscombe" is in the menu but I'm already on Branscombe — a subtle "you are here" highlight would orient me.

---

## Estate facts / "Claremont"

Scrolled down. There's a nice stats block — **37 HOMES · 3 BED / 2 BATH · 104–114m² home area · 350–550m² land · 2026–2028 construction** — big readable numbers, well spaced. Below that a facts table (location 122–124 Branscombe Rd, permit PLN-21-408.02, dwelling mix). All readable on my phone, no zoom needed. Good.

Opportunity: those construction dates (2026–2028) are a big deal for a buyer timing a sale/move — worth pulling that up higher, near the hero.

---

## Floor plans ("Five Architectural Layouts")

Section header is **"HOME DESIGNS / Five Architectural Layouts"** with the line **"Click any floor plan to view full size."** Each type (1A, 1B, 2A, 2B, 2C) is a card with the m² + deck, 3 bed · 2 bath, and the unit numbers it applies to. There's also a 42-second aerial flyover video of a real built home up top — that's a lovely trust-builder, made it feel real.

I tapped the Type 1A floor plan. It opened a **full-screen black overlay lightbox** with the plan and a "Type 1A" label. Good that it opened.

**Two real problems here on my phone:**

1. **I couldn't find a clear close button on the lightbox.** The overlay went dark and showed the plan, but the only "×" I could see was up in the top promo banner area, which is the *banner's* close, not the lightbox's. I wasn't sure if tapping the dark background would close it or if I was stuck. On a phone you need an obvious, big "×" in the top corner of the lightbox itself. I eventually got out, but for a beat I felt trapped — that's the kind of thing that makes me back-button out of the whole site.

2. **Even "full size", the plan is still small on a 375px screen** and the dimension numbers (3200, 1100, etc.) and room labels are tiny — I genuinely can't read them without pinch-zooming. If pinch-zoom inside the lightbox isn't enabled, the "view full size" promise doesn't deliver on mobile.

Opportunity: a dedicated, 44px+ "×" pinned to the lightbox top-right, plus pinch-to-zoom on the plan image, would turn this from "frustrating" to "great." Right now the floor plan is the weakest bit of an otherwise strong mobile experience.

---

## Site map ("Select Your Preferred Home(s)")

This is the heart of it and honestly it's well done. There's a yellow disclaimer box first (floor area / layout / finishes / unit numbering all indicative, registering doesn't guarantee allocation — confirmed in writing before any contract). Clear, sets expectations, no surprises later. Tick on consequence-clarity.

Then a teal instruction panel: **"Click directly on a numbered home in the map below to select it. You can make up to three selections — your first, second and third choice."** That's a perfect explainer — I knew exactly what to do and that I'm capped at 3.

The map itself is a colourful illustrated site plan with coloured blocks per home and a HOME TYPES legend (Type 1A/1B/2A/2B/2C). It's actually nice to look at — felt alive, not a grey form.

The clever bit: below the map there's a **reference list of 37 tappable unit buttons (U1, U2, U3…)**, each **73×44px** — so even if I can't precisely tap a tiny coloured block on the map with my thumb, I can tap the big U-number button instead. **Zero of the 37 are under 44px.** That's exactly the right mobile fallback. Nicely done.

I picked U5 and U6. They registered and a registration form appeared below with my selections.

**Couldn't cleanly verify the "4th selection" guard** — the copy says "up to three" but with the page reloading on me a few times I couldn't get a screenshot of what happens when you tap a 4th. Worth you confirming a 4th tap either swaps one out or shows a "remove one first" message, not just silently ignores it (silent = confusing).

Opportunity: when I select a home, a little confirmation pulse / "added — choice 1 of 3" toast near the map would reassure me the tap landed, since the form is further down the page and I might not scroll to see it.

---

## Purchase terms

Found it. **"SALES TERMS / Purchase Terms — Indicative contract terms… Full contract documentation provided at contract stage."** Then four tidy cards: **DEPOSIT 5% (within 5 days of contract) · FINANCE 30 days · SETTLEMENT on Title · BUILD Modular (~12–14 weeks from site arrival)**, with a note that settlement is turnkey — you take possession of a complete built home. Clear, honest, readable on mobile. No jargon dump. Good.

Opportunity: "5% deposit" sits a bit at odds with the top banner's "no deposit required to register" — they're about different stages, but a one-liner ("this applies only at contract, not to register interest") would stop a careful reader second-guessing.

---

## Registration form + submit

The form appeared once I'd picked homes. Fields: First name (req), Last name (req), Email (req), Phone, Suburb, Postcode, plus dropdowns (buyer type, buyer profile, current housing, purchase timeline, finance status, how you heard, referrer type), a notes box, and a consent checkbox. That's thorough but not exhausting — the only forced fields are name + email, which is the right call. Placeholders ("Jane", "Smith", "jane@example.com", "0400 000 000", "e.g. Claremont", "e.g. 7011") are helpful.

I filled it with test data and **marcus@example.com** (test domain, on purpose), ticked consent, and hit the big **"Register My Interest"** button.

**It worked.** I got back:

> **Thank You for Your Interest!**
> We're excited to have you on board! We've recorded your interest in **2 homes (U5, U6)**.
> You'll receive monthly progress updates and we'll contact you personally as we get within 6 months of completion to discuss next steps.
> **A confirmation has been sent to marcus@example.com.**

That's a genuinely good confirmation — it names the exact homes I picked, tells me what happens next and when, and confirms the email. No dead end, no "now what?" feeling. The form is replaced by the thank-you so I'm not left staring at my own answers wondering if it went through. 

Two small notes:
- The submit is asynchronous (the thank-you appears a moment after the tap). I didn't see a spinner/"Submitting…" state on the button. On a flaky lunch-break connection I'd worry I double-tapped — a quick disabled/"Sending…" state on the button would reassure me.
- Postcode and phone accepted my input fine; I didn't get to stress-test bad input (e.g. letters in postcode) but worth a check.

Opportunity: the thank-you mentions "monthly progress updates" — a one-tap "add to calendar" or "follow on [channel]" right there would catch me while I'm warm.

---

## Connection drops (I lose signal at lunch)

I genuinely couldn't tell how the page behaves on a real network drop because the site itself reloaded under me repeatedly during my visit (it kept dropping back to a blank/fresh state). If that's a real production behaviour and not just my patchy cafe wifi, it'd be worth a look — a half-filled form vanishing on a reload is the single fastest way to lose a buyer. I'd want the form to survive a reload, or at least warn me before it clears.

---

## Voice assistant?

I looked for a voice/chat assistant button in the chrome (the little mic/bubble thing other sites have) and **didn't spot one** on mobile. Not a dealbreaker for a marketing page, but if there's meant to be one, it's not reachable from where my thumb naturally goes.

---

## Standards Check (responsive is my headline)

- ✅ **§1 Responsive** — true 375px: no horizontal scroll (375=375), 16px body text, hero CTA 210×52, all 37 unit buttons 73×44 (none under 44px), menu collapses to a proper drawer. **One miss:** hamburger icon is 40×40, just under the 44px target — fat-thumb mistap risk.
- ❌ **§1 Touch target (hamburger)** — 40×40px, under the 44px minimum. Mistapped it twice. Headline responsive finding.
- ✅ **§5 Explanatory header** — every section tells me what it is / what to do / why (site-map "click a numbered home, up to three"; purchase terms "indicative, full docs at contract"; disclaimer box). Strong.
- ❌ **§6 Voice agent** — no voice/assistant surface found in the mobile chrome.
- ✅ **§7 Scaffold metadata** — tab title "Branscombe Estate — Register Your Interest | F2K", not "Create Next App".
- ✅ **§9 Consequence clarity** — top banner states "registration of interest only, no deposit, no obligation" before anything; disclaimer reiterates no allocation guarantee; thank-you names what happens next. Zero dead ends through the core flow.
- ❌ **Floor-plan lightbox close** — no clear, thumb-sized close button on the lightbox itself (only the banner "×" was obvious); plan still too small to read without pinch-zoom, and I couldn't confirm pinch-zoom works inside it. Felt momentarily trapped.

(— for items not in scope on a phone marketing page: auth pattern §2/§3, app chrome/settings §4, team admin §8 — n/a here.)

---

## Scope note

Phone-only (375px) walkthrough of the public Branscombe Estate page. I did NOT read any source, docs or memory — only what's on the live URL. Registration was submitted with the safe test address **marcus@example.com**; I picked U5 + U6 and reached the real "Thank You" confirmation. Some screenshots came back blank because the live page kept reloading to a fresh state under me mid-visit (noted above as a possible bug); where the visual was lost I verified the same thing via the page's own text instead, so every finding above is from something I actually saw or read on the live site.

Thanks, Marcus
