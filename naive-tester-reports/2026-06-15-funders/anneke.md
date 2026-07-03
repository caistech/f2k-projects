# Naive-Tester Walkthrough — Anneke (Bank Funder)

**Persona:** Anneke Vermeulen — Director, Development Finance at an APRA-authorised ADI. 25+ years in development funding. Generous but candid; reads every screen against operational reality (LVR, ICR, presales cover, senior/junior ranking, security, drawdown, retail mortgage origination).

**Date:** 2026-06-15
**Method:** Live `/browse` only (no repo/docs read), desktop ~1440px.
**URLs walked:**
1. `https://f2k-projects.vercel.app/funders` (overview)
2. `https://f2k-projects.vercel.app/branscombe-estate/funders` (per-project + registration)

**Goal:** Understand the senior/junior offer; register interest in Branscombe end-to-end (senior, then junior, move the junior slider, tick the registered-bank gate, tick consent, submit; email `funder-test@example.com`); confirm a success state.

**Outcome:** Goal achieved. The registration submitted successfully and returned a personalised confirmation echoing my bank name and my junior-lender selection. Numbers integrity is genuinely good. A handful of polish findings below, one of which (silent validation block) I'd want fixed before this goes to a real credit team.

---

## Section 1 — Overview page (`/funders`): the funding model

First impression: this is pitched at *me*, not at retail. The sticky top banner ("FOR REGISTERED AUSTRALIAN BANKS (ADIs) — Registration of interest only. Not an offer or invitation, and not financial product advice") is exactly the disclaimer posture I'd expect, and it's persistent. The page lead — "Demand is the trigger" — is a clean articulation of the actual deal: oversubscribed pre-qualified demand unlocks the facility. That's a real, defensible structuring idea and you've led with it. Good.

The "What F2K delivers" 01–07 chain (demand → DAs → module supply → site works → shipping → installation → finishing) tells me who's carrying delivery risk and where. The note that "construction works invoiced through Global Buildtech Australia" is the kind of counterparty detail a credit committee actually reads — I'm glad it's on the page and not buried.

The three-step "Prove demand · fund the build · first-rights retail" is the part that will make a senior lender lean in: the retail mortgage first-right-of-refusal is the sweetener, and you've tied it to the senior tranche specifically. That's commercially smart and clearly stated.

Terminology check: you use "GRV (gross realisable value)", "GST-correct, on net realisation", "facility peaks low and clears mid-build", "progress-payments flow back as the build rises". That is correct, fluent development-finance language. I did not catch a single term used wrongly, which is rare on a page like this and earns trust immediately.

§5 explanatory header: present and strong — the page opens by telling me what this is, that it's one link in the chain, and who it's directed to.

**Opportunity:** The model leans entirely on the 3× cover trigger, but nowhere on the overview do you define *what counts as a "pre-qualified registration"* — is that a holding deposit, a finance-pre-approved buyer, an EOI with ID? A credit committee will ask "what is the quality of that 300% cover?" on day one. One line defining the qualification standard would pre-empt the first objection.

---

## Section 2 — The capital stack (overview)

The senior/junior framing is clear: one senior bank at 50% with retail FRoR; one or more junior banks sharing the other 50% in 10–50% tranches; every party a registered Australian bank. The stacked bar visual (Senior 50% | five 10% junior blocks) communicates the syndicate shape at a glance.

The honest bit I appreciate: *"Ranking and return between senior and junior are a term-sheet item — subject to formal terms."* You are not pretending to have priced ranking on a marketing page, which is the correct call. I'm not a fan of leaving ranking entirely open — most juniors will want at least a directional steer on subordination and security before they spend committee time — but flagging it as a term-sheet item is defensible at the registration-of-interest stage.

**Opportunity:** A junior lender's first question is "where do I sit on security and on the waterfall?" Even a single illustrative sentence ("juniors are typically subordinated to the senior facility, sharing in second-ranking security") would let me size internal appetite before I register. Right now I'd register *to find out*, which is fine for you (you get the lead) but adds a round-trip for me.

---

## Section 3 — The feasibility calculator (overview) — I stress-tested it

This is the part I expected to be wrong, and it isn't. I pushed it hard.

Baseline (37 units, $685k avg price, $479,324 cost/unit):
- Revenue $25,345,000, Total cost $17,734,988, Surplus $7,610,012, **30% Fundable**. Arithmetic checks.

I dragged **units to max (120)**:
- Revenue → $82,200,000 (= 120 × $685k ✓), Total cost → $57,518,880 (= 120 × $479,324 ✓), Surplus → $24,681,120 ✓, margin held at 30%. Correct.

I then dragged **cost/unit to max ($900,000)** to break it:
- Total cost → $108,000,000, Surplus → **−$25,800,000**, margin **−31.4%**, badge flipped to **"Below hurdle"**. It correctly goes negative and correctly flips the verdict against the 20% hurdle. That's the behaviour I want to see — a calculator that will say no.

Slider ranges are sensible (units 6–120, price $350k–$1.2M, cost $250k–$900k).

The "fundable when margin clears the hurdle (20%)" line, with the formula `(x·y) − Σcost = margin`, is the right level of rigour for a teaser. The asterisk ("Generic gross development margin (pre-GST, pre-finance). Confirmed feasibility is assessed on a GST-correct basis, net of finance") is the correct disclaimer — gross-of-finance, pre-GST margins flatter every deal, and you've said so.

**Opportunity:** The calculator computes a *gross development margin* but a development financier sizes a facility on **peak debt and coverage**, not GDM. The overview prose even says "the facility peaks low and clears mid-build" — that's the number I actually care about, and the calculator doesn't expose it. Adding a "peak facility / peak LVCR" readout (even indicative) would speak my language far more directly than CD%. As-is, the calculator is a developer's feasibility tool wearing a funder's clothes.

---

## Section 4 — Live projects + Sterling (overview)

The live-project cards are appropriately hedged: Branscombe shows an indicative stack (GRV $25.35M, Package $8.00M, Margin 23%, "Demand to date ≈1.5× cover; trigger is 3×"), while Seafields / Wavecrest / Hemp Homes show "Stack pending confirmation". I like that you *don't* publish stacks before the model is confirmed and demand is building — that discipline reads as credible, not coy.

**Sterling voice agent (known issue: not provisioned).** The "Start a conversation" button (`.convai-btn`) opens a panel titled "Sterling — F2K's funder guide" with a typed fallback ("Type your question" + Send). So the typed fallback *renders* — good, that's the degrade path working at the UI level. However, when I typed a real question ("What is the difference between senior and junior here?") and hit Send, the input cleared and **nothing came back** — no reply, no "Sterling is unavailable, please use the form" message. So the fallback is present but inert: it accepts input and silently does nothing. For voice-not-connecting I won't dwell, but the *typed* path producing zero feedback is a soft dead-end a real funder would read as "broken".

Minor: the Sterling avatar is depicted as a young woman, but the copy refers to Sterling as "he" ("He'll explain the structure"). Pick one.

§6 voice reachable: yes, one click from the page.

**Opportunity:** Until Sterling is live, have the typed box post a graceful stub reply ("Sterling's live chat is coming shortly — for specific numbers open a project's funder page, or email dennis@factory2key.com.au"). A silent send is worse than no box.

---

## Section 5 — Branscombe project page (`/branscombe-estate/funders`): the real numbers

This page is the strongest of the two. The stack is concrete and the arithmetic ties:
- GRV $25,345,000; Total development cost (ex-finance) $17,735,006; **Indicative margin 23%** ("GST-correct, on net realisation. Indicative until 3× cover").
- **Funding package $8.00M.** Senior 50% = **$4.00M** (+ retail FRoR); junior tranches 10–50%, "10% ≈ $0.80M". 10% of $8M = $0.80M ✓. The capital-stack bar renders the senior block + five 10% junior blocks with dollar labels. Clean.
- Demand panel: "Current demand ≈ 1.5× cover (≈55 registrations vs 37 lots)" with a progress bar reading "1.5× of the 3× trigger (50% of the way there)." 55/37 ≈ 1.49 ✓, and 1.5/3 = 50% ✓. The numbers are internally consistent across the whole page.

The "called only once subscriptions reach 3× the lots released" line on the demand panel restates the trigger precisely where a funder is looking at it. Good placement.

§5 header: present. §1 responsive at 1440px: no horizontal scroll (scrollWidth == clientWidth == 1440); layout intentional. §7 tab title: "Fund Branscombe — F2K funding | Factory2Key" — correct product name, not a scaffold default.

**Opportunity:** A 23% GST-correct net margin on an $8M facility against a $25.35M GRV is a tidy deal, but I have no **timeline** — drawdown profile, build duration, expected settlement window. "Facility peaks low and clears mid-build" is asserted on the overview but Branscombe gives no months. Add an indicative program (e.g. "18-month build, peak debt ~month 7") and you've answered my second-biggest committee question after security.

---

## Section 6 — The registration form: senior → junior → slider (numbers integrity)

I exercised the form exactly as a funder deciding between positions would.

**Senior (default):** the radio defaults to "Senior lender — 50% of the package + first right of refusal on the retail mortgage book." The participation panel reads **"Senior position — 50% of the funding package — $4,000,000 — Plus first right of refusal on the retail mortgage lending for Branscombe. Read-only — derived from the project package."** Correct (50% of $8M), and correctly marked read-only.

**Junior toggle:** switching to "Junior lender — 10–50% of the package" swaps the panel to **"Indicative tranche — 10% of the package — $800,000"** with the right caveat ("no retail FRoR"). A junior **% slider** (range 10–50, step 1) appears.

**Slider tracking — I moved it and watched the dollars:**
- 25% → **$2,000,000** ✓
- 30% → **$2,400,000** ✓
- 50% → **$4,000,000** ✓ (correctly equal to the senior 50%)

Every step is exactly `pct × $8.00M`. The junior $ tracks the % perfectly. Numbers integrity: **pass**, across the calculator, the stack, the demand bar, and the participation panel.

The fields are the right ones for institutional capture: bank/institution name, contact, role/title, bank-domain email (placeholder literally says "bank-domain email expected"), mobile, division/desk, preferred structure/conditions (free text), and an optional **mandate / term sheet / capacity statement (PDF)** upload. That PDF upload is a nice touch — it tells me you expect a capacity statement, which is how real syndication starts.

**Finding (minor copy):** the registered-bank confirmation checkbox reads literally "I confirm **[institution]** is a registered Australian bank…". The `[institution]` placeholder doesn't interpolate the bank name I typed. Either wire it to the org-name field or change it to "this institution".

**Opportunity:** Capture an **indicative amount range or capacity band** for the junior, not just the % of *this* package. A $0.8M tranche on Branscombe tells you nothing about whether I can carry $4M across the pipeline you keep referencing. A "typical ticket size" field turns a single-project EOI into a pipeline-level capacity signal.

---

## Section 7 — Submit end-to-end + the gates

I completed the registration as **Meridian Australia Bank Ltd / Anneke Vermeulen / Director, Development Finance / funder-test@example.com / mobile / Institutional / Development Finance**, junior position at **25% ($2,000,000)**, with a preferred-structure note ("want ranking, security and ICR/LVR confirmed at term sheet"), both required boxes ticked, and submitted.

**Result: success.** The form was replaced with a personalised confirmation:

> *"Thank you. We've recorded Meridian Australia Bank Ltd's indicative interest in Branscombe as a junior lender. Dennis will be in touch to walk through the term sheet and next steps. This was a registration of interest only…"*

That confirmation does three things right: it **echoes my institution name**, it **echoes my chosen position (junior)**, and it sets the **next step (term sheet)**. That's a proper closed loop — no dead end. (Evidence: screenshots 09–10; the success copy was read from the rendered DOM.)

**§9 consequence clarity — the gates:**
- **"Interest only" stated before submit?** Yes, repeatedly — top banner, page intro, the form intro, *and* in the consent checkbox itself. Unambiguous.
- **Registered-bank gate present + required?** Yes — a dedicated confirmation checkbox ("I confirm [institution] is a registered Australian bank / APRA-authorised ADI, and I am authorised to register this interest on its behalf").
- **Consent present + required?** Yes — "I understand this is a registration of interest only… subject to formal documentation and due diligence. See the funder terms."
- **Funder terms link?** Yes → `/funders/terms` loads a proper "Funder terms & registration notice" page ("No deposit is required or accepted. Registering does not create any legal or financial obligation… directed exclusively to APRA-authorised ADIs"). **Privacy** → `/privacy`. Both real.
- Anti-spam honeypot (`website_url`, "Leave this field empty") present — sensible.

**Finding (this one matters — I'd fix before a real credit team sees it):** the two required checkboxes do **not** carry the HTML5 `required` attribute, and the submit button is **not** disabled when they're unticked. When I filled the text fields, left both boxes unticked, and clicked "Register my interest", the submit was correctly **blocked** (the form stayed, no success) — *but no error message appeared*. From the user's chair it's a **silent no-op**: I click the primary button and nothing visibly happens, with no "please confirm you are a registered ADI" prompt pointing me at the missing box. A funder will read that as a broken button and email you instead (or leave). The gate logic is right; the *feedback* is missing. Add an inline error per unticked box, or disable the button with a tooltip.

**Opportunity:** Send a confirmation email to the registering contact (with the funder terms attached and a copy of what they submitted). An on-screen thank-you is good; an institutional registrant expects a paper trail in their inbox for their own file.

---

## Standards Check

| Rubric item | Result | Evidence |
|---|---|---|
| §5 Explanatory header (each page/panel) | ✅ | Both pages open with what/who/why; the form has its own intro panel. |
| §1/§3 Responsive @1440px — no h-scroll, intentional layout | ✅ | scrollWidth == clientWidth == 1440 on both pages; layout reads intentionally. |
| §1 Body text ≥16px / nothing <12px | ❌ | Font sample on Branscombe found 9.6px and 12px/12.5px/14px elements (fine-print/labels). 9.6px is below the <12px floor. |
| §6 Voice agent reachable (≤3 clicks) | ✅ | "Start a conversation" opens the Sterling panel in one click on both pages. |
| §6 Voice typed fallback functional | ❌ | Panel + typed input render, but Send produces no reply and no "unavailable" message — silent. (Voice-not-connecting noted as known issue; the *dead* typed path is the finding.) |
| §7 Tab `<title>` is the product name | ✅ | "For Funders — The F2K funding model \| Factory2Key" and "Fund Branscombe — F2K funding \| Factory2Key". |
| §9 Consequence clarity — "interest only" stated pre-submit | ✅ | Banner + intro + form intro + consent checkbox all state it. |
| §9 Registered-bank gate present + required | ✅ (logic) / ⚠️ | Checkbox present and enforced (submit blocked when unticked), but no `required` attr and **no visible error on block** — silent no-op. |
| §9 Consent present + required | ✅ (logic) / ⚠️ | Same as above — enforced but silently. |
| §9 Funder terms / privacy link | ✅ | `/funders/terms` and `/privacy` both load real content. |
| §9 Zero dead ends | ⚠️ | Main flow closes cleanly (personalised success). Two soft dead-ends: silent Send on Sterling, and silent block when checkboxes unticked. |
| Numbers integrity — senior 50% / junior 10–50% off package | ✅ | Senior $4.0M; junior 10/25/30/50% = $0.8M/$2.0M/$2.4M/$4.0M; all = pct × $8.0M. |
| Numbers integrity — junior slider $ tracks % | ✅ | Verified live at 25/30/50%; exact. |
| Numbers integrity — feasibility calc + hurdle | ✅ | Recomputes correctly across all sliders; flips to "Below hurdle" at negative margin. |

---

## Closing — strategic suggestions

1. **Speak peak-debt, not just GDM.** The single highest-leverage addition is a peak-facility / coverage readout. You already say the facility "peaks low and clears mid-build" — *show* it. Margin% is the developer's metric; peak LVCR and ICR are mine.
2. **Give juniors a directional steer on ranking/security** before they register. You'll convert more committee time into mandates if I can size appetite from the page.
3. **Fix the silent gate.** Enforced-but-invisible validation on the *registered-bank* and *consent* boxes is the one thing here that could read as "broken" to the exact audience you're courting. Inline errors or a disabled button.
4. **Confirmation email + capacity capture.** Close the loop into my inbox, and capture a ticket-size band so a single EOI becomes a pipeline-capacity signal.
5. **Define "pre-qualified registration."** The whole model rests on 3× cover; tell me what one unit of that cover actually is.

Overall: this is a credible, well-disciplined funder teaser with genuinely correct numbers and the right disclaimers — better than most bank-facing intermediary pages I see. Tighten the validation feedback and add the financier-native metrics and I'd happily put it in front of our development-finance desk.

Anneke
