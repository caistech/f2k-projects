# F2K Projects — Naive-Tester Walkthrough (Developer / Landowner persona)

Hi Dennis,

**Persona:** Anneke — property developer / landowner, 25+ years in subdivision and estate delivery, expert operator
**URL:** https://f2k-projects.vercel.app
**Goal:** Explore the public site, walk the `/developers` onboarding as a developer with an estate in mind (fake test identity, up to but not through submit), glance at `/agent` and `/admin`, and decide whether I'd trust F2K with my estate.
**Duration:** ~40 minutes equivalent

---

## Landing page

- Loads clean (200), no console errors, tab reads *"Factory2Key Projects — Australian Housing Developments"* — a real title, not a scaffold default. Good first impression.
- The interactive Australia map is a nice touch — tap a state, tap a pin, jump to an estate. On mobile it reflows sensibly and the hamburger holds the full nav (states + estates). No horizontal scroll at 375px. I'm a fan of this.
- The standing disclaimer banner — *"Registration of interest only, no deposit required or accepted"* — sits at the very top of every page. For someone who's watched off-the-plan deposit messes, that upfront honesty reads as grown-up, not defensive.
- Estate cards are well-labelled: state, a status pill (Registration Open / Concept Stage / In Development), lot/home counts, and a plain-English blurb. I immediately understood Seafields is 145 serviced lots 8km north of Geraldton, Branscombe is 37 approved homes near Hobart, Dutton Terrace is a ~40-home concept. That's exactly the triage a developer wants.
- Friction: the black *"Report a problem — get it SayFixed"* pill floats bottom-left and sits on top of the map / content. Handy, but it never moves and slightly covers the artwork. I'd tuck it into a corner that isn't over live content.
- Terminology nit: your voice guide on the landing is **"Marni"**, but on the `/developers` page the very same guide is called **"Morgan"**. Two names for one assistant will make people wonder if they're talking to two different systems. Pick one.
- **Opportunity:** the map is doing marketing work, but a developer's eye goes straight to *"where's the proof this gets built?"* A small "delivered so far" strip (homes completed, estates activated) near the fold would turn a pretty map into a credibility signal.

## Estates (buyer-facing lot pages)

- Landing on the Seafields estate page, the interactive lot plan is genuinely good — numbered lots, Public Open Space, named roads (David Road, Pead Fairway, Sutcliffe Road North), and a footer stamp *"CLE 3027-08B · 22 April 2026 · Subject area 678.9×443.8m"*. That plan reference and survey area tell me someone has the real deposited plan behind this, not a cartoon. As an operator that earns trust fast.
- *"Click any lot to view its details and add it to your registration. Lots marked Reserved are not available"* — clear next action, no guessing.
- Friction: the header showed *"Developer: Dual Focus"* as a chrome label on one estate view I landed on via `/developer`. To a first-timer that's opaque jargon — is that a developer's name? a mode? Either label it plainly or hide it from public view.
- **Opportunity:** show a lot's *indicative house-and-land* pairing right in the lot detail — the whole "Path A" pitch on the developer page is "a lot shown with the home it could carry reveals the true potential." Prove that on the live buyer map and you're selling the thesis, not just describing it.

## `/developers` onboarding (the main event)

- This is the strongest page on the site, and it's clearly written by someone who has actually run estates. The framing lands: *"an estate = a new residential site with room for at least 20 homes,"* then **Path A (you're subdividing lots)** vs **Path B (you're planning homes too)**. I knew within 20 seconds which one I am.
- The "how it works, end to end" five-step spine (list → build your estate page → engage local agents → gather registrations & read signals → go/adjust/stop, then activate) is exactly the de-risking story a cautious developer wants. "Test your masterplan against real demand before you spend big" is the right hook.
- The form itself is impressively domain-aware — this is the part that made me sit up:
  - **Lot & plan number / title reference**, with a note that it auto-checks *wind zone, council, zoning overlays and easements*. That's real developer plumbing, not a generic contact form.
  - **Zoning / planning status** dropdown with the correct ladder (zoned-ready → rezoning in progress → DA lodged → DA granted → concept → raw land).
  - **Site ownership / control** (owned / under option / negotiating / not secured), with an honest note that a project needs the site controlled to proceed.
  - **Deposited (survey) plan** upload, with the genuinely useful line: *without it we can only show an estimated indicative boundary; provide it and we draw the exact parcel.* That's the right incentive, explained well.
  - Repeatable **sales agents** block, **indicative commercials** (land cost vs nearby market values, anchored to funder feasibility), deal-structure preferences (outright / JV / staged / build-to-rent).
  - The required consent checkbox — *"submitting is on the basis that Factory2Key acts as estate manager — leading the project, lot allocations, management and delivery"* — states a material commercial term **before** the click. I appreciate that it's not buried; a developer needs to see that F2K wants to run the estate, not just list it.
- **Bug / standards gap — ABN field is a plain text box.** It's labelled *"11-digit ABN"* but typing an ABN does nothing — no lookup, no entity-name confirmation. For a form whose whole job is "confirm who we're dealing with," an ABN that resolves to the registered entity (ABR lookup) is table stakes. Right now I could fat-finger a number and you'd never know.
- **Bug / confusing — the Location field.** Its placeholder promises *"Start typing the suburb / town, then pick a suggestion…"*, which sets the expectation of address autocomplete. When I typed "Geraldton" the page instead navigated me away to the Seafields estate page — twice. Either the suburb autocomplete isn't wiring up (I saw no geocode/Mapbox call fire) and something else is capturing the keystrokes, or it's matching my text to an existing F2K estate and jumping there. Whichever it is, a developer typing their own site's suburb should get suggestions, not get thrown off the form. This one cost me my part-filled form.
- Note for your team: driving this React form in a headless browser was flaky for me — field refs invalidated and the page jumped a couple of times. Some of that is the test harness, but the location-field navigate-on-type is reproducible and real, so I'm flagging it rather than blaming the browser.
- Good hygiene I did notice: required fields (name, email, estate name) are marked, and the honeypot field is named neutrally (`hp_field`) so a password manager won't trip it. Someone thought about that.
- I stopped at the **Submit my project** button and did not click it (didn't want to fire a real enquiry). The path *to* submit is clear and the consequence is stated.
- **Opportunity:** the page tells me F2K will "engage funders" and act as estate manager, but nowhere do I see *who has done this before*. Before I hand over estate-manager rights to my land, I need one or two "we delivered X estate, here are the homes, here's the developer who'd vouch for us." Add a short proof block above the form — track record, a delivered-homes gallery, a named reference — and the conversion from "interesting" to "I'll enquire" gets much easier.

## `/agent` and `/admin` entry points

- `/agent` → `/agent/login` — a proper **agent portal** login, scoped per estate (*"Sign in to the Seafields agent portal to see your clients and lot availability"*). It has the full pattern: explanatory subheader, forgot-password, a **Show** password toggle, *"email me a magic sign-in link,"* and an *"Activate your account"* path for invited agents. That's a well-built door.
- `/admin` → `/admin/login` — gated admin door (*"Projects Admin"*), with an eye-icon password toggle, magic link, and forgot-password. Cleaner/sparser than the agent login (no explanatory subheader) but functional.
- Minor inconsistency: the agent login uses a text **"Show"** toggle, the admin login uses an **eye icon**, and the public developer form uses neither pattern. Three login-ish surfaces, three treatments. Unify them.
- Dual-portal separation is correct: the public user path (`/developers` onboarding) reaches a real, functional area (the form) rather than dead-ending into an admin gate; agent and admin are gated separately. No facade.
- **Opportunity:** from the public site there's no signpost that agent/developer/funder portals even exist for *me* after I enquire. A one-line "once your estate is live you get your own developer dashboard" with a screenshot would make the platform feel real, not promised.

## Standards Check (portfolio non-negotiables)

- **Responsive (375 + 1440):** ✅ No horizontal scroll at 375px; hamburger nav holds full menu; cards and form stack; forms full-width.
- **Auth-page pattern:** ✅ Agent + admin logins both have forgot-password, password visibility toggle, and magic-link. (Toggle style differs between them — cosmetic.)
- **Authenticated chrome (nav / Settings / Sign Out):** — Not reachable; couldn't authenticate (no test agent/admin credentials), so I can't verify the signed-in chrome.
- **Explanatory header:** ✅ Landing, `/developers`, and agent login all open with what-it-is/what-to-do context. Admin login is thin but present.
- **Voice agent reachable ≤3 clicks:** ✅ Convai widget + "Start a conversation" on landing (Marni) and developers (Morgan). ❗Persona name inconsistent across pages.
- **Scaffold metadata:** ⚠️ Tab titles are real product names on every page (pass), **but** `favicon.ico` 404s and there are no icon `<link>` tags — the browser tab shows no F2K icon. Add a favicon.
- **Dual-portal separation (user path ≠ admin dead-end):** ✅ Public developer onboarding is a real functional surface; agent/admin gated separately.
- **Codicils — consequence clarity:** ✅ Required "F2K acts as estate manager" acknowledgment states the material term before submit; contact consent mentions unsubscribe.
- **Codicils — address / ABN autocomplete:** ❌ ABN field is plain text with no ABR lookup; the location field advertises suggestions but did not produce them (and navigated away on type).
- **Codicils — zero dead ends:** ⚠️ Mostly clear, but the location-field navigate-on-type threw me off the form — a real dead-end for a developer entering their own suburb.

## Would I trust F2K with my estate?

Cautiously, yes — enough to pick up the phone. The developer page speaks my language better than most builder pitches I've seen: title reference, deposited plan, wind zone, zoning ladder, funder feasibility, and an honest upfront "we become estate manager" term. That honesty and the real Seafields lot plan (with its survey stamp) tell me there's substance here. What's missing before I'd actually sign over estate-manager rights is **proof of delivery** — who has F2K built for, where are the finished homes, who'll vouch for them. Most estates on the site are "Concept" or "In Development," so the track record isn't yet visible. Fix the ABN lookup and the location field, put a track-record block above the form, and settle on one voice-guide name, and this goes from "promising" to "I'm in."

## Scope note

**Covered:** Landing (desktop + mobile/375), the Seafields buyer lot map, the full `/developers` page and its onboarding form (fields inspected, identity fields filled with the fake test identity, walked to but not through Submit), the voice widget presence, and the `/agent` + `/admin` login doors.
**Blocked / not covered:** Signed-in agent/developer/admin dashboards (no test credentials), so authenticated chrome (persistent nav, Settings, Sign Out) is unverified. Driving the React form headlessly was intermittently unstable — the location-field navigation issue is reported as a real finding, but I could not complete a full clean field-by-field fill in the automated browser.

Anneke
