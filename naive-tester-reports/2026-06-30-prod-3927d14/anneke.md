Hi Dennis,

**Persona:** Anneke — 25+ years in property development & estate sales, evaluating F2K as an operator who'd put her own buyers through it
**URL:** https://f2k-projects.vercel.app (production, commit 3927d14)
**Goal:** Walk the public site + estate pages, register interest end-to-end, decide if I'd trust it with my buyers
**Duration:** ~45 min equivalent

I'll say up front: this is one of the more credible estate-marketing sites I've walked in a while. The compliance posture, the lot-selection map, and the lead-qualification depth are genuinely good. But there's one pricing display on Seafields that would stop me cold in front of a buyer, and a couple of copy inconsistencies that an experienced eye catches in seconds. Detail below.

---

### Landing page (desktop + mobile)
- Clean, confident first impression. The Australia map with coloured states and estate pins is a lovely way in — "tap a state, tap a pin." I knew exactly what to do.
- The top "REGISTRATION OF INTEREST ONLY — no deposit required or accepted" banner sits on every page. As an operator I appreciate that you've made the legal posture impossible to miss; it protects you and sets buyer expectations honestly.
- Four estates surfaced with clear stage badges (Registration Open / Concept Stage / In Development). Good signalling — I instantly understood which ones are live.
- Nice touch: tab title reads "Factory2Key Projects — Australian Housing Developments" (not a default scaffold), and the F2K favicon is set.
- Mobile (375px): no horizontal scroll, 16px body text, the nav collapses to a hamburger drawer that groups estates by state (WA → Seafields, SA → Dutton, TAS → Branscombe, Multi-state → Hemp). That state-grouped drawer is the best part of the mobile experience.
- Minor: the floating black "Report a problem — get it SayFixed" pill overlaps the map and the hero CTA on several pages. It's useful, but it parks itself right over content (it sat on top of the "Add to my registration" and "Select your lot" buttons more than once). I'd lift it clear of primary actions.

**Opportunity:** The map is the star — consider a hover/tap tooltip showing lot counts or "from $X" per pin so a buyer gets a price anchor before they even click in.

### Seafields Estate (the flagship — Registration Open)
- This is a serious page. Staging table (7 stages, what's open/locked/reserved), zoning (R20), planner and WAPC plan reference, covenant note, market fundamentals ($533k median, 27% growth, <1% vacancy), six modular home designs with floor plans, and four Joey colour schemes down to the Dulux/Colorbond codes. As an operator, this is the level of substance buyers and agents actually ask for. I'd be comfortable handing this to a serious enquirer.
- The interactive subdivision plan is excellent: Plan / Satellite / Schematic grid / Official drawing views, filters for purchase type, land size and price, stage tabs, an "available only" toggle, and a live "X lots match — Y dimmed" counter. This is better than most developer portals I've used.
- **The one that would stop me cold (real bug):** I clicked an available lot (Lot 238, 815m², "Premium", Sutcliffe Road). The detail card shows **two purchase options at the *same* price — "House + Land Package $933,400" and "Serviced Land Only $933,400."** Serviced land only cannot cost the same as land + a built modular home. And $933,400 for an 815m² serviced block 8km from Geraldton (median house $533k) is wildly out of line with this very page's headline "land from $155k / H&L from $485k." A buyer who clicks a lot and sees raw land priced like a luxury house-and-land package loses trust instantly — and so does the agent who sent them. This looks like a lot-pricing data record that's either placeholder or mis-mapped. The italic caption "Prices shown are from the current reserve" doesn't explain it and reads as jargon to a buyer.
- The registration form (after selecting a lot) is a proper lead-qualification instrument: name, email, phone, suburb, postcode, primary + secondary dwelling per lot, buyer type, buyer profile, current housing, purchase timeline, finance status, "how did you hear" (required), referrer type (required), notes, consent. That's exactly the data I'd want to triage a pipeline. Strong.
- Address field uses a Mapbox-style autocomplete and **auto-filled the postcode** when I picked "Geraldton, Western Australia" — small thing, but it's the kind of polish that reduces drop-off.
- **I completed a full registration end-to-end.** It submitted, showed a clean "Registration Received — we've recorded your interest in 1 lot" screen, and said a confirmation was sent to my email. No fake success, the form genuinely posted. That's the single most important thing for a registration tool and it works.

**Opportunity:** Fix the lot-detail pricing first — it's the highest-leverage credibility issue on the site. And rename "Developer: Dual Focus" in the Seafields header (see below).

### Branscombe Estate (Registration Open, TAS)
- Beautiful colour-coded site plan (Type 1A–2C homes mapped onto the lots). Detailed: 37 homes, permit number, designer (Unison), 7-star energy, parking allocations, five floor-plan types, three elevation colour schemes with full material specs.
- Different registration model here — a simpler "Join the waitlist" form (full name, email, mobile, "what best describes you?", consent + marketing opt-in). The copy explains why: "when you're ready, your agent will help you note your preferred home(s)." So Branscombe defers home-selection to an agent, while Seafields lets buyers self-select lots. That's a defensible difference by sales stage, but worth being deliberate about — a buyer hopping between the two estates will notice one lets them pick and one doesn't.
- **I submitted the Branscombe waitlist successfully** — "You're on the waitlist," confirmation emailed. Validation correctly blocked me until I ticked the required collection-notice consent.
- Consent copy is thorough and compliant (names Factory2Key Pty Ltd, the introducing agency and vendor, links the privacy policy). Good.
- Minor: the "Keep me updated by email and SMS" marketing opt-in is **pre-ticked by default**. The required collection notice is unticked (correct), but best practice for the marketing channel is an unticked, active opt-in. Not a blocker, but tidy it if you want to be beyond reproach on consent.

### Dutton Terrace (Concept Stage, SA)
- For a concept-stage site this is impressively complete: the vision (residential + childcare + aged-care), a Mapbox location map with an indicative-boundary disclaimer, an automated site analysis (wind region A2, BAL-LOW bushfire, climate zone 5), a "Living in Tumby Bay" lifestyle section, and the masterplan mix. The honesty about "concept stage, land division still to be approved" is the right call.
- Full qualification form (same depth as Seafields, plus indicative-budget bands). I didn't submit this one.
- **Copy inconsistency (would catch a buyer's eye):** the hero says "~65 family homes," the stats and masterplan say "~65," but the About paragraph says "around **40** single-family homes." Pick one number — a sharp buyer reads both and wonders which is real.

**Opportunity:** That automated site-check (wind/BAL/climate from the address) is a differentiator. I'd surface it more prominently — developers and buyers both love seeing "engineered to this site's conditions" backed by data.

### For Developers (the operator-facing intake — most relevant to me)
- This is the page that made me sit up. "Have an estate in mind? Let's build it together." A 3-step flow, and a real voice guide — **Morgan** — who'll walk you through the form, plus a deep developer-onboarding intake: enquiring-as, estate name, location, lot/plan/title reference (with an auto site-check on wind/council/zoning), site size, zoning status, site control, project shape, target market, land uses, indicative commercials (land cost, comparable values), a **sales-agents section where each agent gets their own F2K portal**, title/deposited-plan upload, deal-structure preferences, and plan uploads. As a developer this is exactly the conversation I'd want to have.
- Two cautions as an operator: (1) the consent block asks me to acknowledge that **"Factory2Key acts as estate manager — leading the project, lot allocations, management and delivery"** just to *submit an enquiry*. That's a meaningful commercial commitment to gate a first-contact form behind; some developers will balk at agreeing F2K runs their estate before a single conversation. Consider softening that to "subject to agreement" at enquiry stage. (2) Morgan threw errors for me — see below.
- **Bug (observed):** the developers page logged repeated **HTTP 500 errors** (three of them) while I was interacting with Morgan, and the voice widget showed a "Not supported" banner. I was on a headless/no-microphone setup, so the voice path correctly degraded to a "type your question" text box (good — that's honest degrade-don't-fake behaviour). But the recurring 500s look like a real backend failure on the voice token / chat endpoint that's worth checking — if a developer's first interaction is "voice guide unavailable," it undercuts the "talk it through with Morgan" pitch the whole page is built on.

### Agent & Admin portals — BLOCKED (no credentials this run)
- `/agent` and `/admin` both correctly redirect to their own gated login (`/agent/login`, `/admin/login`). I could not go behind either — no credentials were available — so the agent portal (buyers + masked availability) and the admin control panel are **untested this run**.
- I did evaluate the login *experience*, and both pass the bar I'd expect:
  - **Agent login:** email + password, "Forgot password?", a "Show" password toggle, "Email me a magic sign-in link instead," and an "Activate your account" invite flow. Explanatory subtitle ("see your clients and lot availability"). Clean.
  - **Admin login:** email + password, "Forgot password?", magic-link, and a "Show password" eye toggle. Also clean.
- `/login` (generic) returns a 404 — fine, since the buyer side has no login; just don't link to it anywhere.

---

### Other Strategic Feature Suggestions
- **Price integrity pass on every lot record.** The Lot 238 issue suggests the per-lot pricing data isn't being validated against the headline bands. A simple guard ("land-only price must be < H&L price, and within the published band") would catch this class of error before a buyer ever sees it.
- **One consistent registration spine across estates.** The Seafields lot-picker and the Branscombe waitlist feel like two different products. A buyer comparing your estates notices. Even if the depth differs by stage, keep the visual language and the "what happens next" copy identical.
- **Show a price anchor before the click.** Right now a buyer has to open a lot to see any number, and when they do (on Seafields) it's wrong. A "from $X" on each available lot in the map, sourced from the validated band, would set expectations and reduce the shock.
- **Comparable sales / "why now" on each estate.** Seafields has the market stats; Branscombe and Dutton would benefit from the same. Buyers and their agents make the case to themselves with those numbers.
- **Agent-facing collateral kit.** Since each agent gets a portal, give them a one-click "share this estate" pack (PDF + link) — agents who can market easily, market more.

### Standards Check (portfolio non-negotiables)
- §1 Responsive — ✅ Landing at 375px: no horizontal scroll, 16px body text, hamburger drawer with state-grouped estates; desktop reflows cleanly. Forms full-width on mobile.
- §2 Auth-page pattern — ✅ Both agent and admin logins have forgot-password, a password visibility toggle (text "Show" on agent, eye icon on admin), and a magic-link option. (Could not exercise the reset *delivery* — no creds.)
- §4 Authenticated chrome + Settings — — N/A this run (agent & admin portals blocked, no credentials; couldn't reach an authed page).
- §5 Explanatory header — ✅ Every page and the login screens open with a clear what-it-is/what-to-do line; estate pages and the developer intake explain themselves well.
- §6 Voice agent — ❌ (partial) Voice guide (Morgan) exists only on `/developers`, and it threw 500s + showed "Not supported" for me. No voice surface on the buyer-facing landing or any estate page (the "Report a problem" pill is SayFix, not voice).
- §7 Scaffold metadata — ✅ Real product titles on every page (landing, estates, developers, logins); F2K favicon, not the default feather.
- §9 Codicils (observable) — ✅ mostly: address field uses autocomplete and auto-fills postcode; honeypot is correctly named `hp_field` (autofill-safe); forms genuinely submit with real confirmation screens + email (no fake success); "no deposit / no obligation" consequence framing is everywhere; next action is always obvious. ⚠️ minor: Branscombe marketing opt-in is pre-ticked; the developer form gates submission behind an "F2K acts as estate manager" acknowledgement.

**Scope note:** Covered — landing (desktop + 375px mobile), Seafields (full estate page + interactive lot map + lot-detail modal + completed registration with email confirmation), Branscombe (estate page + completed waitlist submission), Dutton Terrace (full concept-stage page + form, not submitted), For Developers (Morgan voice guide + intake form inspected), and the agent + admin **login** experiences. Blocked — the **agent portal** and **admin control panel** behind those logins (no credentials this run), and the **Morgan voice call itself** (no microphone in this environment — only the degraded text path was reachable, which surfaced the 500s). Note: the browser tooling restarted itself several times mid-session, which is an environment artifact, not a product issue.

Net: I'd trust the *registration plumbing* with my buyers today — it captures the right data and genuinely sends. I would not put a buyer in front of a Seafields lot card until that $933,400 land-only price is fixed, because that single number does more damage to credibility than everything else on the site does to build it.

Thanks, Anneke
