# Seafields — Local Employer Accommodation: walkthrough

**Tester:** Anneke (domain-operator persona — regional WA business owner near Geraldton, currently flies staff in/out, sick of the cost and churn)
**URL:** https://f2k-projects.vercel.app/seafields/employers
**Date:** 2026-06-15
**Device:** Desktop (~1440px). Mobile is a separate tester's job — I've flagged anything that *looks* like it'd break small, but I didn't certify the mobile pass.

---

## What I was trying to do

Someone sent me this link. I run a logistics operation outside Geraldton and I fly diesel mechanics, warehouse leads and a couple of admin staff in from Perth every week because there's nowhere local for them to live. I wanted to work out what this page actually offers me, pick the path that fits, and register my interest — both the "buy a house for staff" route and the "rent beds" route.

---

## Screen 1 — The landing / the fork ("How do you want to secure staff accommodation?")

First impression: good. The hero says "Stop flying your team in and out" and the sub-copy nails my exact problem in one sentence. That's the right hook for someone in my position — I felt seen, not sold to.

Then immediately, **before any form fields**, I get a clean two-card fork:

- **Own it** — "Buy a house-and-land package and use it for staff. Takes you to the standard Seafields buyer registration." → *Go to buyer registration →*
- **Rent it (take-or-pay)** — "Reserve a guaranteed number of beds for a fixed term, without owning. Open the take-or-pay form here." → *Choose take-or-pay →*

This is exactly how I'd want it. No-one's dumped a 15-field form on me before asking what I'm even here for. The little line under the heading — "Owning sends you to our standard buyer registration; renting opens a take-or-pay form here" — sets expectations honestly so I know clicking "Own it" is going to take me somewhere else. I'm a fan.

**Opportunity:** the two cards are content-identical in weight, but for a FIFO employer the *rent* path is the one you most want to capture (it's the novel offer, and the buy path already exists). Consider a one-line "Most employers in your position start here" nudge on the rent card. Minor.

**Bug (cosmetic):** the floating black "Report a problem — get it SayFixed" pill sits right on top of the "Go to buyer registration →" text on the Own-it card at desktop width. The whole card is still clickable (the link worked fine), so it's not a dead end — but it looks untidy and half-hides the CTA wording. I'd nudge that pill down or out of the card's path.

---

## Path A — "Own it" (the redirect)

I clicked the Own-it card. It took me to **`/seafields-estate?ref=employer`** — the standard Seafields estate / buyer registration page, with the `?ref=employer` tag preserved on the URL so they can see I came in as an employer. Tab title there reads "Seafields Estate — Register Your Interest | F2K".

Critically: **this is a pure redirect, not a second duplicate form.** The employers page didn't try to re-capture my details and then bounce me — it just sent me to the real buyer registration, where the lot-picker + "Select Your Preferred Lot(s)" registration lives. That's the correct pattern. No data captured twice, no place lost, no dead-end. Tick.

**Verdict on the three brief-critical Own-it questions:**
- Fork obvious and before any fields? **Yes.**
- Own-it a pure redirect (not a duplicate form)? **Yes** — it's a plain `<a href="/seafields-estate?ref=employer">`, the destination page has its own registration.
- Where does it land + does `?ref=employer` survive? **Lands on the real Seafields buyer registration, `?ref=employer` preserved.** Sensible, not a dead-end.

---

## Path B — "Rent it (take-or-pay)"

Clicking "Rent it" doesn't navigate away — it reveals, in-place below the fork, (a) a "Talk to Morgan" voice panel and (b) the take-or-pay form. The Rent card's label also flips to "Selected — form below ↓", which is a nice bit of feedback so I know my click did something and where to look.

### B1 — Morgan (the voice agent)

There's a "New to take-or-pay? Morgan will walk you through it" panel with a portrait and a "Start a conversation" button. The explanatory line is good: "Morgan explains how a take-or-pay rental commitment works, then helps you complete the registration below, field by field. It's optional."

I clicked it. The panel opens cleanly (no errors in the console), shows Morgan's description and a **"Type your question" text box with a Send button** — i.e. there's a text fallback when there's no microphone, which is the right behaviour. I typed a real question ("How does take-or-pay work and what happens if I don't fill all the beds?") and hit Send.

**Finding (soft):** my typed question didn't produce a visible answer in the panel after waiting, and I saw no network call go out to the voice backend. On my desktop (no mic) the agent opens and shows the fallback input but the conversation didn't actually start / respond. No error was thrown — it just sat there. A real employer who relied on Morgan to explain the commercial commitment would be left hanging. I'd want the text channel to either answer, or say plainly "voice needs a microphone — here's the short written version" rather than accept my message into silence. (This may behave differently with a real mic — worth a live voice-auditor pass.)

### B2 — The take-or-pay form ("Reserve staff beds — take-or-pay")

The form opens with a genuinely good explanatory header: *"Tell us how many beds you'd commit to and for how long. A take-or-pay commitment reserves a set number of beds for a fixed term — that guaranteed demand is what lets us build local housing so your people stop flying in and out. This is a registration of interest only — not a lease, and not an offer."* That paragraph does real work — it explains *why* they're asking and de-risks it in the same breath. I'd commit to reading the rest after that.

Fields:
- Business name * 
- ABN (optional)
- Contact full name *
- Contact email *
- Contact phone
- Staff needing accommodation
- **Whole house(s) / By the room** (radio pair)
- How many [whole houses? / rooms / beds?] — *label changes with the radio*
- Commitment term (6 / 12 / 24 / 36 months)
- Required start date
- FIFO roles this would replace (optional, free text) — the placeholder explicitly says it "helps us show funders the demand is real," which is honest about why they want it
- "We'd also consider buying a house-and-land package for staff" (optional)
- Consent checkbox * ("registration of interest only, not a lease or offer…")

**Things I liked:**
- The **dynamic quantity label works** — toggling Whole house(s) → By the room changes "How many whole houses?" to "How many rooms / beds?". Small thing, but it's the kind of detail that stops me second-guessing what number to type.
- The **consent checkbox is mandatory and clearly worded** — I can't accidentally fire off a "commitment" without acknowledging it's interest-only.
- The FIFO-roles question is smart. As an operator that's the field I'd most want to fill, because it lets me make my real case ("3 mechanics + 2 admin, flown in weekly").

**The "would also consider buying" nudge (what it does):** ticking it reveals an inline line — *"Register to buy instead → (or finish the take-or-pay form below — we'll cover both)."* The "Register to buy instead →" is a working clickable control. This is a good cross-sell: it offers the buy path **without yanking me out of the rent form** and reassures me they'll handle both. Exactly the right tone for a hedging employer. No complaints.

**Edge cases I tried:**
- **Empty submit:** correctly blocked. Business name, contact name, email, and the consent checkbox all fire required-field validation ("Please fill out this field." / "Please check this box if you want to proceed."). No false success.
- **Bad ABN ("12345"):** **accepted as valid.** No client-side ABN format or checksum check, and no ABN lookup/autocomplete on the field. As an operator I'd expect an ABN field to at least reject obvious junk or, better, look up and confirm my business name from the ABN. Right now I could fudge it or fat-finger it and you'd capture garbage. *(Finding — see Standards Check §9.)*
- **No address field at all** on the rent form — fine for a take-or-pay interest, but worth noting there's nowhere to capture *where* my staff are based (which matters for "is this near Seafields?"). Minor gap, not a bug.

**Full valid submit:** I filled the lot with a fake business (Geraldton Coastal Logistics Pty Ltd, valid ABN format, throwaway email, 8 staff, 3 whole houses, 24-month term, Sept start, real FIFO blurb, consent ticked) and hit "Register take-or-pay interest."

- POST to `/api/seafields/employer-register` → **200**, ~2s, no console errors.
- Success state: the form is replaced with **"Interest registered — Thank you. We've recorded Geraldton Coastal Logistics Pty Ltd's take-or-pay interest for Seafields staff accommodation. Dennis will be in touch to size the demand and walk through the commercial terms. This was a registration of interest only — it creates no obligation on either side."**

That's a model confirmation: it echoes my business name back (so I trust it saved the right thing), tells me **who** will contact me and **what** happens next, and reiterates the no-obligation framing. No dead end, no "now what?" moment.

**Verdict on the three brief-critical rent-it questions:**
- Does the take-or-pay form actually submit and confirm? **Yes** — 200 + personalised success state.
- Console errors? **None** at any point (landing, fork, Morgan open, submit).

---

## Terminology / nitpicks

- "Take-or-pay" is the correct industry term and they define it well, but it's jargon for a lot of small employers. The Morgan explainer + the form header carry it, so it's covered — *as long as Morgan actually answers* (see B1).
- Footer says "Real estate marketing only. No financial product is offered on this site." Good, appropriate, and consistent with the interest-only framing throughout. No complaints there.

---

## Standards Check

- **§1 Responsive** — — *n/a (full pass is the mobile tester's call).* At 1440px there's no horizontal scroll and the layout is intentional. The form is single-column and readable. One thing to watch on mobile: the floating SayFix pill already overlaps a CTA at desktop, so it's likely to crowd things small.
- **§5 Explanatory header** — ✅ Every surface opens with what-it-is/why-it-matters: the fork ("Two paths…"), the form ("Tell us how many beds… that guaranteed demand is what lets us build local housing… registration of interest only, not a lease"), and the Morgan panel. Success state keeps an explanatory tone too.
- **§6 Voice agent** — ❌ *Reachable* (≤1 click on the rent path) and it opens cleanly with a text fallback and no console errors — but the typed message produced no response and fired no backend call on a no-mic desktop, so the channel didn't actually function for me. Opens-but-doesn't-answer is a fail for a help agent. (Worth a live mic pass to confirm.)
- **§7 Scaffold metadata** — ✅/❌ split. Tab title is correct and product-named ("Local employer accommodation — Seafields | Factory2Key"), not "Create Next App." But there's **no `<link rel="icon">` in the head**, so the tab shows the browser default — flag to add the F2K favicon.
- **§9 Codicils (observable)** — ✅ on consequence clarity (the consent checkbox + "registration of interest only, creates no obligation" stated before submit and required; success reiterates it) and on zero-dead-ends (every screen has an obvious next step; the buy-nudge offers a path without trapping me). **❌ on validation:** the ABN field accepts obvious junk ("12345") with no format check and no ABN lookup/autocomplete; there's no address autocomplete either. Per the rule, ABN fields should use ABN lookup.

---

## Scope note

I tested at desktop (~1440px) only, via headless browser. I could not exercise Morgan with a real microphone, so my voice finding is "opens + text fallback present, but didn't answer / no backend call observed" rather than a full voice verdict — a live mic pass (voice-auditor) should confirm whether the agent actually converses. I did not test the downstream Seafields buyer registration form itself (only confirmed the Own-it redirect lands there correctly with `?ref=employer`). I submitted one complete take-or-pay registration with fake business details and a throwaway email; that row is real test data in the employer-register table.

---

## Bottom line

This is a well-built fork. The thing that matters most for my situation — being asked *which problem I have* before being handed a form — is done right, and the take-or-pay path submits end-to-end with a confirmation that actually tells me what happens next. The two things I'd fix before sending this to real employers: (1) make Morgan actually answer (or degrade to a written explainer) — right now she opens and goes quiet, which undermines the one feature meant to explain the scary-sounding "take-or-pay" commitment; and (2) validate the ABN field (and ideally ABN-lookup it), because as it stands you'll collect junk business identifiers. The SayFix pill overlapping the fork CTA and the missing favicon are tidy-ups.

Nice work overall. Fix Morgan and the ABN field and I'd be comfortable handing this to a peer.

— Anneke
