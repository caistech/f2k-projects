# F2K Projects — legal + tax decisions needed from Dennis

**Date:** 2026-07-30. **Source:** `/naive-tester` audit of live production
(`naive-tester-reports/2026-07-30-1826/`).
**Why these are yours and not mine:** each needs a fact about the legal entity, or a decision with tax
consequences. Both are explicitly flagged in `PRODUCT_STANDARDS` / `REGULATORY_INCLUSIONS` as
operator decisions that must never be defaulted by whoever is writing the code. I have not guessed
any of them.

---

## 1. The privacy policy contains a placeholder, under a mandatory consent tickbox

**Live text:** *"Factory2Key Pty Ltd (ACN to be inserted)"*.

This is the exact failure `REGULATORY_INCLUSIONS` §3.2 exists to prevent, and it is a **hard fail,
always** — not because a policy is missing, but because a registrant has already ticked a box
agreeing to a document that says "to be inserted". The tickbox is mandatory on the ROI form, so every
registration to date has consented to it.

**What I need from you (exact values, not approximations):**

| Field | Needed |
|---|---|
| Registered entity name | as it should appear publicly |
| ACN | |
| ABN | |
| Registered / postal address | must be reply-capable and valid ≥30 days |
| Contact email for privacy enquiries | |

**Also missing from the policy** and needed before it's compliant:

- **Retention** — how long registrant data is kept.
- **The OAIC pathway** — a registrant's right to complain, and how.
- **Overseas transfer disclosure** — LeadConnector/GHL processes this data offshore and isn't named.
  Supabase, Vercel and Resend also need naming as subprocessors.
- **The voice agent.** Marni's vendor consent modal points registrants at *this* privacy policy to
  explain recording and third-party processing, and the policy never mentions voice at all.

**Question for you, and it is a real fork:** is the operator behind these surfaces **Factory2Key**, or
**Global Buildtech Australia Pty Ltd** (the canonical portfolio sender identity, ABN 54 672 395 685)?
The "whose brand travels" gate means I must not assume. The email footer and the privacy policy have
to name the same party.

---

## 2. `/terms` returns 404

The footer links to it and the consent tickbox references it. There is no page.

Given the site sells land and house-and-land packages, this is not a template drop-in — it needs to
say what a registration actually is (an expression of interest, not an offer or a reservation), which
matters given the "registration doesn't reserve a lot" model already decided for this estate.

**Decision needed:** do you want me to draft `/terms` from that model for your review, or does Kim
(or whoever handles F2K's legal) write it?

---

## 3. No GST qualifier anywhere on a page quoting $155,000–$829,700

There are **zero occurrences of "GST"** on the site. A business or investor buyer reads an unqualified
figure as the amount that leaves their account.

`PRODUCT_STANDARDS` is explicit that this is an operator decision with tax consequences and never a
copy default, and that I must not guess whether a price is inclusive or exclusive. It also notes this
rule had been given verbally more than once and kept being missed because it was never written down —
which is why I'm asking rather than picking.

**Decision needed:**

1. Are the published land prices **GST-inclusive or exclusive**?
2. Same question for the **house-and-land package prices** — they may differ, and the margin scheme
   commonly applies to subdivided land while the build is standard-rated.
3. Should the site show a qualifier per price, or one statement covering all prices?

Once decided this is a small change, and it should be derived from a single constant rather than typed
next to each number. Note the buyer here is Australian, so "GST" is correct — no currency selector to
account for.

---

## 4. One thing already done, for completeness

Auth email was dead for a month (Supabase Auth holds its own copy of the Resend key; the app's key was
rotated on 2026-06-29 and Supabase's was never updated). Repaired and verified — magic link and
password reset both deliver. A separate hole found in the same audit, where any stranger could
provision an account and trigger a branded email from our verified domain, is fixed and deployed
(PRs #55, #56).

---

## Status of the URL gate

`naive-tester` is recorded as **FAIL** for the current production deployment — 11 of 22 observable
checks. Items 1–3 above are part of that, alongside the lot-data contradictions now with Uwe
(`punchlist-uwe-lot-data-2026-07-30.md`) and a set of mechanical fixes I can do without decisions
(admin table unusable at both 375px and 1440px, the registration form silently discarding typed data,
missing favicon, CSV exports pulling lead PII without a confirm, no voice surface in the admin portal,
no `llms.txt`/JSON-LD).

The product URL stays withheld until that gate passes. Say the word and I'll start on the mechanical
set while these decisions are with you and Uwe.
