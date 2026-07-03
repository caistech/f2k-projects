# Builder Handoff — `/developers` revisions + new `/partners` (Civil Partners) page

**Date:** 2026-07-03
**Goal:** Update the developer-facing surfaces so the offer reads as "your land deal stands on its
own" (homes are optional upside, not a condition), explain the deal/split/fairness, and add a new
Civil Partners page. Copy is written; this is the implementation.

## Source of truth
- **Copy:** `Downloads/F2K_Website_Copy_Developer_and_Civil_v2.md` (v2) — use verbatim, EXCEPT the
  civil-JV wording correction below (§C note).
- **Strategy/why:** `docs/developers-proposition-office-hours-2026-07.md`.
- **Numbers/logic behind it:** `Generic_Estate_Deal_Model_V5.xlsx` — for reference only. **Do NOT put
  dollar figures, fee %s, or the finance internals on the page.** The only model data that appears
  publicly is the split table (below).

## Guardrails (apply to every change)
- **Numbers stay in the conversation.** Public pages show the *logic* (uplift, costs-back-first,
  the split ladder) — never the uplift %, PM fee, introducer fee, or any $.
- **Responsive** (375px + 1440px), **explanatory header** on each new page/section, persistent
  chrome, voice agent reachable — same standards as the rest of the site.
- **Structure = three role-scoped pages:** `/developers`, `/agents`, `/partners`. This adds
  `/partners`.

---

## A. `/developers` page revisions
**File:** `src/app/(public)/developers/page.tsx`

Insert/replace these blocks (full copy in v2 doc, Part 1). Order top → bottom:
1. **Hero lead line** — add "Your land deal stands on its own" + the sub-line, above the two paths.
2. **New section "How the deal works"** — includes the **split table** (see Data below).
3. **New section "Is it fair?"**
4. **New section "We prove it up before anyone spends big"** (this partly exists — reconcile with the
   current "prove your estate up" section, don't duplicate).
5. **Revise Path A** and **Path B** to the v2 wording (Path B makes F2K homes explicitly optional).
6. **New section "How it works, stage by stage (and who pays)"** — 3 steps; note the comps clarifier
   is already in the v2 copy ("priced from local comps… the feasibility confirms the costs leave
   enough room").
7. **Add link to the civil page** — "Are you a civil contractor or earthmover? → See how you can
   partner on the civil works" → links to `/partners`.

## B. Estate-manager consent checkbox — REWORD
**File:** `src/components/developers/DeveloperOnboardingForm.tsx` (the `estateManagerAck` checkbox
label, currently ~line 977).

- **Current label text:** "I understand that submitting this estate (which is free) is on the basis
  that **Factory2Key acts as estate manager — leading the project, lot allocations, management and
  delivery of the homes** — as set out in the estate submission terms."
- **Replace the bolded clause with:** "**Factory2Key acts as estate manager — leading project
  orchestration, sales strategy and lot allocation across the estate. Home delivery via F2K modular
  is an option I can choose, not a condition of the partnership.**"
- Keep the "(which is free)" framing and the link to `/developers/terms`. This removes the
  contradiction with the new "land deal stands on its own" hero.
- Consider whether `docs`/`/developers/terms` page text needs the same softening (check for the
  "delivery of the homes" phrasing there too).

## C. New `/partners` (Civil Partners) page
**File:** `src/app/(public)/partners/page.tsx` (new). Copy = v2 doc, Part 2.
- Sections: Hero → Two ways to partner (Contractor / Financing partner) → "The honest part — when to
  stay a contractor" → "Same money, whichever way we show it" → CTA.
- **CTA/form:** a lightweight "register interest" form (reuse the developer-onboarding form pattern,
  or a minimal name/company/ABN/message form). Feeds the same lead pipeline; tag source = `partners`.
- Civil-as-*introducer* (the 1%-of-land-value referral) stays a `/partners` concept but is a
  SEPARATE role from the contractor/financing options on this page — don't merge them.

> **⚠️ Copy correction for §C before you build it (supersedes v2's wording on this one point).**
> V5 confirms the civil-JV financing return comes **off the top of the uplift**, not "as a base
> line." Use this wording in Option 2 and "Same money":
> - Option 2 reward: *"…you earn a financing return equal to your finance cost at the project's
>   internal rate — taken off the top of the estate's uplift, before the landowner and F2K split the
>   rest. A fixed amount equal to your finance cost, not a percentage of the upside. No more, no less."*
> - Same money: *"Whether we show it as a carry on your capital or as an off-the-top share of the
>   uplift, it reconciles to the one figure — fixed by the rate, the amount and the time. Priced once,
>   visible, nothing that quietly grows or shrinks."*
> Keep the "this is a financing return, not equity upside" honesty line.

---

## Data that appears on the page — the split table (the ONLY hard numbers)
Source: V5 `C104` formula. Use exactly:

| Where your site is | Your split |
|---|---|
| Conception — raw land, no approvals | 40% you / 60% F2K |
| Part-developed — DA in train, money sunk | 50% / 50% |
| De-risked — approved, conditions cleared | **60% you** / 40% F2K |

## Nav / linking
- `/developers` links to `/partners` (§A step 7). Decide whether `/partners` also gets a top-nav
  entry alongside `/developers` and `/agents`, or is reached only from `/developers` for now.

## Not in scope (separate track — F2K model, not the site)
The V5 spreadsheet has two open items Dennis is resolving in the model; **they do not block this
build** (no figures are on the page): (1) the orphaned $613k infra finance carry in Contractor+Internal
mode; (2) confirm PM fee 5% vs 3%. Ignore for the page work.

## Acceptance checks
- [ ] "Your land deal stands on its own" is prominent on `/developers`; Path B reads as optional.
- [ ] Estate-manager checkbox no longer says F2K delivers the homes as a condition.
- [ ] `/partners` exists, both options explained, civil-JV described as an **off-the-top financing
      return fixed at finance cost** (not equity upside, not a base line).
- [ ] No dollar figures / fee %s anywhere on either page; split table matches 40/50/60.
- [ ] Both pages responsive (375 + 1440), explanatory headers present, `/naive-tester` clean.
