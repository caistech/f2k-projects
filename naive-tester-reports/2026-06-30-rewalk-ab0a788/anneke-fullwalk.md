Hi Dennis,

**Persona:** Anneke — 25+ years selling estates and house-and-land, candid and pragmatic.
**URL:** https://f2k-projects.vercel.app (live prod, commit ab0a788)
**Duration:** ~1 full pass — Landing → Public estate pages + registration + Marni → Admin portal → Agent portal → Cross-path.
**Tooling note:** I drove this through the headless /browse daemon, which is known to drop sessions and mis-fire on SVG/interaction. Where a finding could be a daemon artifact I've said so plainly and cross-checked against real data instead of trusting one signal.

---

## 1. Landing page

Clean, fast, and it reads like a real developer's shopfront. Title tag is right ("Factory2Key Projects — Australian Housing Developments"), the EOI disclaimer sits up top, and the State → Location → Estate structure in the nav is genuinely good — four estates (Seafields, Dutton, Branscombe, Hemp Homes) all reachable. The Australia map with state tiles is a nice touch.

Two nits:
- **Favicon is missing.** `/favicon.ico` returns 404 and there's no `<link rel="icon">` in the head, so the browser tab shows a generic globe. The `<title>` is correct, so this is cosmetic, but it's the kind of thing a sharp buyer notices when they've got six tabs open.
- **Marni's panel busts the mobile viewport** — see §2.

## 2. Mobile / responsive (390px)

- **Horizontal scroll on mobile — confirmed bug.** At 390px the page is 430px wide (40px of sideways scroll) on both the landing and the Seafields estate page. The culprit is the new **Marni "Talk to Marni" panel** (`.convai-panel`): it renders at a fixed 390px width inside a 310px-wide container starting at x=40, so it pokes 40px past the right edge. Screenshot: `screenshots/03-mobile-marni-overflow.png`. This is the elementlabs/convai widget not shrinking below the viewport. It's the one clear responsive regression from the new voice feature.
- **Landing card text is fine** — estate card headings 20px, body ≥16px, eyebrows at the 12px floor. No sub-12px text.
- **Stage chips:** at 390px the "STAGES: Stage 1…7" chips are 22px tall / 12px text — *below* the ≥44px / ≥16px the brief expected. BUT they are a **non-interactive colour legend** (plain `<span>`s, no click handler, no pointer cursor), not tappable filter controls, so the 44px touch-target rule doesn't strictly bite. Worth knowing: there are **no Type/Size/Price selects and no view toggle** on the Seafields page at all — only the stage legend. If those filter controls were part of the fix, they aren't present on this estate.
- **Registration form inputs: could not test** — the form is gated behind selecting a lot on the map, and I couldn't operate the map headless (see §3). So the ≥44px form-input check is unverified.

## 3. Public estate pages + registration + Marni

### Marni voice concierge (Change #3) — VERIFIED, and she's good

Marni is present on the landing **and** on Seafields, Branscombe and Dutton estate pages. No mic in headless (expected), so I used the typed fallback, which is exactly the degrade-don't-fake behaviour you wanted. She answered sensibly:

- *"What's the difference between land only and house and land?"* → "Serviced Land Only means you buy a titled block and can build with any builder… A House & Land package means the land plus a Factory2Key modular home, a complete solution by F2K." Spot on.
- *"If I register does that mean I have to buy it?"* → "Not at all — registering is just an expression of interest… no deposit required or accepted, nothing is reserved, you're not obligated unless you sign and exchange a contract later." She **restated "expression of interest only"** unprompted. Screenshot: `screenshots/02-marni-reply.png`.

This is the standout new feature. It does its job.

### Seafields lot selection (Change #1) — COULD NOT VERIFY (flagging for a real-browser check)

This is the one I want you to look at yourself. The whole registration flow hinges on clicking a green "available" lot on the interactive subdivision plan ("The registration form opens once you choose at least one lot"). **In headless I could not get a single lot to select** — not Lot 238, not any green cell, via real Playwright clicks or synthetic events, after long hydration waits and multiple retries. The form never opened ("Pick a Lot Above to Begin" stayed put), no console errors.

Digging into the DOM: the map SVG is `role="img"`, and across all 882 elements in it there are **zero React click/pointer handlers, zero onclick attributes, and zero pointer-cursor lots**, while other buttons on the same page (Marni, "Expand floor plan", the menu) *do* carry handlers and work (a floor-plan modal opened fine). On its face that says "static image, lots not clickable."

**BUT** — and this is why I'm not calling it a hard P0 — the admin registrations list shows **real lot-selecting registrations landing in the last three days**: "dentest — L308 — House & Land" (29 Jun), "Fahad — L312 — Land only" (27 Jun). Real buyers picked lots and chose Land vs H&L very recently. So either something broke at commit ab0a788, or (more likely, given this daemon's track record on this repo) the interactive map is a client-only/dynamically-mounted component that simply doesn't hydrate in the headless daemon, leaving the static SSR map I was poking at.

**Net:** I could not open the Lot 238 card, so I **cannot confirm Change #1** (that an H&L lot no longer shows "Serviced Land Only" at the same price). Please click Lot 238 in a real browser and eyeball the card. The two purchase options *do* exist as concepts everywhere else (the "Two Ways to Buy" section, the Land/H&L column in admin), so the data model is right — it's the card display I couldn't see.

### Other estate notes
- Branscombe and Dutton both load, carry the EOI header, have correct page titles, and Marni is present. Branscombe's map is the same static `role=img` shape as Seafields.
- `/dutton-terrace` 404s, but the landing correctly links to `/dutton-terrace-estate`, which works — so that's just my bad guess, not a broken link.

## 4. Admin portal

Logged in cleanly via the form (Mode A) with the QA admin account. Login page has forgot-password, a show-password toggle, and a magic-link option — auth pattern is complete.

- **Chrome is excellent.** Persistent left navbar on every route (Dashboard, Analytics, Reports, ROI Waitlist, Agents, Email Templates, Audit Log, the State→Estate accordion, Settings, Sign Out at the bottom). Active-route indicator, the lot.
- **Settings page** (`/admin/settings`): Profile / Password / Email preferences / Account, explanatory header, password field, sign-out-everywhere. Solid.
- **Sign Out works** — drops to `/admin/login`, and re-hitting `/admin` bounces to `/admin/login?redirectTo=/admin`. Auth gate holds.

### ROI Waitlist (Change #4) — VERIFIED (structure)

`/admin/roi-waitlist` now has columns **Buyer | Agent | Category | Status | Sent | Actions**. Every row has a **"Send qualification form"** button, and clicking it pops a confirm that **names the recipient** — *"Email the qualification form link to Anneke Vandermeer (mcmdennis+anneke-branscombe@gmail.com)?"* — which is exactly the consequence-clarity you want before an outreach fires. I dismissed it (no email sent).

One gap I couldn't close: every row's **Sent value is "—"** (nothing's been sent yet), so I couldn't see the column actually render a date + sender. The column and the send action are there; the populated state is just unverified because there's no sent data.

### Reports — funder Qualified count (Change #5) — NOT CONFIRMED

`/admin/reports` is the Morgan-led builder (good explanatory header, dataset/estate/view/breakdown selects, "Run report"). I ran the **Branscombe Coverage (demand vs supply)** report — it shows price-tier cover, but:
- **No "Qualified" stage funnel anywhere** — no Registered → Qualified count.
- It shows **0 interest across all four Branscombe price tiers despite 24 Branscombe registrations existing** ("overall cover 0.00× · 37/37 available"). That's a real data gap — the coverage report isn't seeing the 24 registrations as demand (they're presumably not joined to priced units).
- When I asked **Morgan directly** for "the funder demand report for Branscombe showing registered and qualified counts," she replied: *"our system currently only tracks registrations (ROI submissions). We don't yet have instrumentation for pipeline stages like verified or pre-qualified, so I can't give you qualified counts."*

So the builder's own engine denies the qualified-stage capability. Yet the **ROI Waitlist rows clearly carry a "qualified" status** (Phoenix, Pat, Jack all show "qualified"). So the data exists, but the **funder demand-coverage report in `/admin/reports` is not surfacing a Registered→Qualified count**. If that count lives on the separate funder-facing page rather than `/admin/reports`, that's not where Change #5 said to look — flagging as not confirmed.

(The deterministic "By finance status" breakdown for Branscombe *does* return real numbers — 10 pre-approved / 6 exploring / 5 not started / 2 prefer-not / 1 cash = 24, which ties out. So registration data is healthy; it's the coverage/qualified join that's the gap.)

## 5. Agent portal (Change #6) — UNVERIFIED (no lead data for this agent)

Injected the pre-minted agent session (Mode B) — landed on `/agent` as a Branscombe agent (referral link `/r/branscombe?ref=PKIT…`, sidebar: Dashboard / Availability / Documents / Profile / Sign out, Export CSV).

The **"Awaiting their registration form" panel did not appear**, and the string "awaiting" is **nowhere in the page DOM**. The reason: this agent has **zero linked clients** ("No clients linked to you yet"). So the panel is almost certainly empty-state-gated and there's simply no data to show it. I could not verify the panel or its Send button. To test it you'd need to seed a lead against this agent (a referral registration that hasn't completed the form yet), then re-check the Dashboard.

## 6. Cross-path / auth segregation — ONE REAL FLAG

Signed-out access is properly blocked (`/admin` → login redirect). But:

**The agent account `dennis@factory2key.com.au` can reach `/admin` and see real registration PII.** With the agent session active (and after the admin had signed out), navigating to `/admin` rendered the full admin dashboard showing live data — "SEAFIELDS REGISTRATIONS 15", "BRANSCOMBE REGISTRATIONS 24" — and the session email displayed was `dennis@factory2key.com.au`. It also reached `/admin/roi-waitlist`.

Two readings, both need your action:
- **If `dennis@factory2key.com.au` is meant to be a non-admin (it's your designated QA user/agent test identity):** this is a **release-blocking cross-access vulnerability** — an agent reaching the admin control panel and buyer PII. The `/admin` allowlist isn't gating this account.
- **If `dennis@factory2key.com.au` is intentionally a real operator-admin (it's your own F2K-domain address):** then it's miscast as the "non-admin agent" test account, which makes the cross-access test impossible and quietly violates the QA invariant that the user/agent identity is never in the admin allowlist. Use a genuinely non-admin email for the agent QA identity.

Either way it's not in a shippable state as-is. Worth thirty seconds to confirm which one it is.

---

## STANDARDS CHECK

- **§1 Responsive / touch / text** — ❌ Horizontal scroll at 390px (page 430px wide) caused by the Marni `.convai-panel` overflowing on landing + estate pages. Card/text sizes otherwise fine.
- **§2 Auth page pattern** — ✅ Admin login has forgot-password, show-password toggle, and magic-link.
- **§4 Authed chrome + Settings + Sign Out** — ✅ Persistent admin navbar, full Settings page, working Sign Out with redirect-back gate.
- **§5 Explanatory headers** — ✅ Present on estate pages, registration section, ROI waitlist, Reports, Settings.
- **§6 Voice reachable** — ✅ Marni on landing + every estate page (text fallback works); Morgan on /admin/reports.
- **§7 Browser tab title** — ✅ Titles correct ("…— Register Your Interest | F2K", etc.); — favicon missing (404 favicon.ico) is a minor sub-item.
- **§8.5 Dual-portal separation + user-dest ≠ admin-dest** — ❌ Agent account `dennis@factory2key.com.au` reaches `/admin` with real PII. User/agent and admin destinations are NOT segregated for this account.
- **§9 Consequence clarity** — ✅ ROI "Send qualification form" confirms with the recipient named before firing.
- **§9 Zero dead ends** — ⚠️ Inconclusive: the Seafields registration path dead-ends in headless (can't select a lot → form never opens), but real registrations are arriving, so this is likely a daemon artifact — needs a real-browser confirm.
- **§9 Address autocomplete** — — Not reached (registration form unreachable in this session).

---

## Scope: covered vs blocked

**Fully walked:** Landing (desktop + 390px mobile); Marni text concierge (landing + Seafields), incl. EOI restatement; Seafields/Branscombe/Dutton estate page load, titles, EOI headers, Marni presence; admin login (form), full admin chrome, Settings, Sign Out + re-access gate; ROI Waitlist columns + Send confirm; Reports builder (Coverage + finance-status breakdown + Morgan query); Agent portal layout; cross-path auth.

**Blocked / inconclusive:**
- **Seafields lot card (Change #1)** — couldn't operate the interactive map headless (likely daemon artifact; real registrations exist). Needs a real-browser click on Lot 238.
- **Registration form mobile sizing (Change #2 form part)** — form unreachable (gated behind lot selection).
- **Reports Qualified count (Change #5)** — not found in /admin/reports; Morgan denies the capability.
- **Agent awaiting-form panel (Change #6)** — agent has no linked clients; panel didn't render.

Net: Marni (#3) and the ROI Waitlist Sent column + Send (#4) are real and working. #1, #5, #6 I could not confirm (data/headless reasons, all flagged). The two things I'd act on regardless of the daemon: the **mobile horizontal-scroll from Marni's panel**, and the **agent-reaches-/admin cross-access**.

Thanks,
Anneke
