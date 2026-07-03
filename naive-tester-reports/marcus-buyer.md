# Naive-Tester Report — Mobile Marcus (prospective home buyer)

Hi Dennis,

**Persona:** Mobile Marcus — phone only (iPhone SE, 375px), fat thumbs, flaky signal, pinch-zooms anything under 16px.
**URL:** https://f2k-projects.vercel.app
**Goal:** As a would-be buyer who heard about a Factory2Key estate, browse the landing + an estate page (Seafields) and try to get on the waitlist / register interest, up to the submit step. Fake data only ("Marcus Test", marcus+test@example.com).
**Duration:** ~30 min equivalent.

I got a genuinely good first impression on the phone, but I could not actually reach and fill the buyer registration form — partly because it's hidden behind a fiddly tiny-lot map, and partly because the page was so heavy my browser kept choking on it. Details below.

---

## Section 1 — Landing page (/)

- The tab said **"Factory2Key Projects — Australian Housing Developments"**. Good — I knew what I opened, not "Create Next App".
- Right at the top: *"REGISTRATION OF INTEREST ONLY — No deposit is required or accepted."* I liked that a lot. As a buyer on a phone I'm always half-worried I'm about to accidentally commit to something. This told me I'm safe before I even scrolled. **But** that banner text is tiny (12px) — I had to pinch-zoom to read the reassurance that's meant to relax me. **Opportunity:** bump that disclaimer to 16px so the one line you *most* want people to read isn't the one they squint at.
- The headline "Factory2Key Projects" + "Tap a state to see what we're building there, or go straight to an estate by tapping its pin" is a clear explanatory header — I knew what to do.
- The interactive **Australia map** is a nice touch and it fit my screen with no sideways scrolling. The state names (WA, NT, etc.) are small though, and a couple of pins ("Dutton Terrace", "Branscombe") sit close together down near SA/Tas — with my thumbs I'd worry about hitting the wrong one. **Opportunity:** slightly larger pin hit-areas, or a fallback "jump to estate" list right under the map for thumb users.
- Below the map, each estate is a proper card (Seafields / Dutton / Branscombe / Hemp Homes) with a status badge (Registration Open / Concept Stage / In Development) and a clear "Select your lot →" / "Register interest →" link. This is exactly the kind of "what do I tap next" clarity I want. The little eyebrow labels ("WA · RESIDENTIAL SUBDIVISION") and badges are 12–14px though — readable-ish but on the small side.
- **The hamburger menu** (top-right) is a proper 44×44 target — I could hit it. It opens a clean drawer grouped by state with every estate listed. Good mobile nav.
- **"Talk to Marni"** — there's a voice guide with a friendly face and a "Start a conversation" button. Nice for someone like me who'd rather ask "what's the difference between land and a house-and-land package" than read a spec sheet. It's clearly marked optional.
- Emotional register is right for a home you'd actually live in — warm navy/cream, real house photos, "Let's build it together". It doesn't feel like a tax form.
- **Opportunity:** overall the landing sells the concept well; the main fix is text size (12–14px in several spots) for us squinters.

## Section 2 — Seafields Estate page (/seafields → /seafields-estate)

- Tapping through worked and the friendly `/seafields` shortcut redirected cleanly to `/seafields-estate`. Tab title "Seafields Estate — Register Your Interest | F2K". No sideways scroll on my phone.
- Huge amount of genuinely useful buyer info: 145 lots, land from $155k, H&L from $485k, stage map, two ways to buy, the home designs (Joey/Koala/EMU/BigRoo) with prices, even colour schemes and indicative sales terms. As a buyer I felt *informed*. The repeated "no deposit / expression of interest only / real estate marketing only" reassurances are everywhere — consequence is crystal clear before anything.
- Marni the voice guide is here too, scoped to Seafields. Good.
- **The catch — the interactive subdivision plan.** To register, the page says *"The registration form opens once you choose at least one lot on the subdivision plan above."* The plan is a small map (~340×230px on my screen) with 145 lots crammed in. Individual lots are **tiny** — way under a thumb's width. There are zoom +/− and fullscreen buttons (good that they exist), but as a fat-thumbed guy on a phone, precisely tapping "Lot 237" out of a grid of postage-stamp shapes is genuinely hard, and I'm the one you most need to make it easy for. **Opportunity:** for mobile, offer a simple tappable **list of available lots** ("Lot 237 — 525m² — $155k — Select") as an alternative to bulls-eyeing the map. Let me register interest in "any lot / help me choose" without first winning a game of thumb-darts.
- **Dead-end risk:** because the whole registration form is *hidden* until you successfully tap a lot, a buyer who just wants to "get on the list" and can't nail a tiny lot has nowhere to go. The instruction copy ("Pick a lot above to begin") is clear, so it's not a *blind* dead-end — but it is a precision gate that a phone user can stall at. **Opportunity:** a "Not sure which lot? Register your interest anyway →" escape hatch that opens the form with lot = undecided.
- I could not complete the form fill. Every time I tried to select a lot, my browser fell over (see the honest note below), so I never saw the actual name/email/submit fields render on mobile. That part is **unverified** — I can't tell you if the inputs are full-width, whether the submit button spans the screen, or whether the fields are 16px. Flagging it rather than guessing.
- **Opportunity:** whatever the form looks like, make sure a mobile buyer can reach it in one or two thumb taps from "I want in", not four.

## Section 3 — Renderer / stability (honest tester-tool note)

- The Seafields page is **heavy** (long page, big interactive SVG plan, lots of images, voice widget). My headless test browser repeatedly crashed to a blank page (`about:blank`) the moment I interacted with the lot map, and a couple of my taps also mis-fired into `/developers`, `/agent/login` and `/admin/login` instead of the thing I aimed at. I retried several times with a fresh browser; it kept happening only on the Seafields page, never on the (lighter) landing page, which rendered rock-solid at both 375px and 1440px.
- A real iPhone Safari/Chrome would very likely render this fine, so I'm not calling the site broken — but the *weight* of the page is a real signal. On my "intermittent network" a page this heavy is a slow, data-hungry load, and a heavy interactive map is exactly what struggles on a mid-range phone. **Opportunity:** measure Seafields on a real throttled phone; consider lazy-loading the subdivision SVG + home-design gallery so the top of the page (and the "register" path) is usable before the whole thing arrives.

---

## Standards Check

- ✅ **Page live (P1):** Landing and Seafields both returned HTTP 200; `/seafields` 307-redirects to `/seafields-estate`.
- ✅ **Explanatory header:** Both pages open with what-it-is / what-to-do ("Tap a state…", "Select your preferred lot…").
- ⚠️ **Responsive 375 + 1440, no h-scroll:** No horizontal scroll at 375px on landing AND Seafields; landing verified clean at 1440px too (intentional, not stretched). Seafields could NOT be re-verified at 1440 (renderer crashed) — partial.
- ❌ **Touch ≥44px / text ≥16px:** Hamburger is 44×44 ✅, but multiple sub-16px text runs (12px disclaimer banner, 12–14px nav items, eyebrow labels and status badges) and, critically, the subdivision-plan lot targets are far under 44px — the core buyer action is a tiny tap target.
- ✅ **Nav collapses on mobile:** Hamburger → clean state-grouped drawer; horizontal nav at 1440px.
- ✅ **Landing sells the concept:** Interactive map, clear estate cards with status + prices, strong reassurance framing.
- ✅ **Emotional register:** Warm, real photography, "Let's build it together", Marni guide — right for a home buyer, not a grey form.
- ✅ **Voice agent (Marni):** Reachable from the chrome on landing and estate pages, clearly optional.
- ✅ **Tab title:** Real product names, not "Create Next App".
- ⚠️ **Zero dead ends:** Next action is *labelled* clearly ("Select your lot →", "Pick a lot to begin"), so not a blind dead-end — but the registration form is gated behind a precision tap most phone users will fumble, with no "register anyway" fallback.
- ❌ **Buyer form reachable/fillable on mobile:** Could not reach or fill it — gated behind the tiny-lot map + the page crashed my browser on interaction. Unverified and flagged.

## Would I register?

**Not on this visit — but I'd come back.** The estate content sold me; I *wanted* to get on the Seafields list. I bailed because I couldn't reliably tap a specific tiny lot and there was no "just put me on the list" option, and the page was heavy enough to feel sluggish on a phone. Give me a tappable list of available lots (or an "undecided lot" path) at 16px+ targets and I'd register in a heartbeat.

## Scope note

I browsed only the URL (no repo/docs). Landing page fully walked at 375px and spot-checked at 1440px. Seafields estate page read in full (content, disclaimers, plan, voice) at 375px, but the buyer **registration form itself was never reached** — blocked by the tiny-lot selection gate and repeated headless-renderer crashes on this heavy page (retried multiple times with a fresh browser). Dutton/Wavecrest/Branscombe estate forms were not individually walked. No data was submitted; no real outreach fired.

Marcus
