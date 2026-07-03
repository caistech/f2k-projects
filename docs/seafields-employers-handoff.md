# Handoff Brief — `/seafields/employers` (Local Employer Accommodation)

## Business concern (read first)
Local businesses around Seafields currently fly in FIFO workers because there's
no local accommodation. Many of those roles **don't need to be FIFO** — the only
blocker is housing. This page captures those employers and routes them into one
of two paths so we can (a) feed genuine buyers into the existing pipeline and
(b) size a **take-or-pay rental commitment** that lets us underwrite housing
stock against guaranteed employer demand.

The page must **not** become a second registration form for investors. Investors
go back to the main Seafields flow untouched. Only the rental path is new.

**Scope note:** Seafields-specific for now. Build it so the pattern *could* be
lifted to another estate later, but do **not** generalise prematurely — no
Branscombe wiring. Take-or-pay is **admin-handled**: no agent attribution on
this path.

---

## INSPECT FIRST (do this before writing anything)
1. **Voice agent pattern** — find how the voice agent is wired into the other
   public-facing forms (likely the main Seafields registration page). Identify
   the component/hook, how it's mounted, how it reads/fills form fields, and how
   it's configured per-page (prompt, field map, etc.). This page reuses that
   exact pattern — match it, don't reinvent it.
2. **Main Seafields registration page** — find its route and confirm the exact
   URL to redirect investors to. Note any query params it accepts (e.g. source/
   referrer tagging) so we can attribute employer-sourced investor leads if the
   flow supports it.
3. **Supabase conventions** — look at how the existing registrations table is
   defined (naming, estate scoping, RLS, timestamps, inbound-ready columns).
   Mirror those conventions for the new table below.
4. Report what you found at each checkpoint before proceeding.

---

## Route
`/seafields/employers`

---

## Front-door routing (the core logic)
On entry, present a single decision before any form fields:

> **"How do you want to secure staff accommodation?"**

- **Own it** (buy a house & land package for staff use)
  → This is a standard Seafields buyer with a different motivation.
  → **Redirect to the main Seafields registration page.** No data captured here,
    no new table row. If the main flow accepts a source param, tag it
    (e.g. `?source=employer`) so we can see how many buyers came via this door.

- **Rent it (take-or-pay)** (guaranteed beds without owning)
  → Show the **take-or-pay registration form** below.

Keep this routing explicit and obvious in the code — the #1 failure mode is
accidentally building a duplicate registration form on the own-it side.

---

## Take-or-pay registration form (the new piece)

Fields:
- Business name
- ABN
- Contact name
- Contact email
- Contact phone
- Number of staff needing accommodation
- Unit preference — **whole house(s)** | **by the room**
- Quantity (houses or rooms, depending on preference above)
- Commitment term — the "take" (e.g. 6 / 12 / 24 months)
- Required start date
- FIFO roles this would replace (optional — narrative value for funders)
- "Would also consider buying?" checkbox (optional — converts renters → the
  own-it path; if ticked, surface a link/nudge back to main registration)

### Voice agent support
Mount the **same voice agent pattern** used on the other pages, configured to
assist the employer as they complete the take-or-pay form. It should be able to
explain take-or-pay in plain terms, prompt for the fields above, and fill them.
Use the per-page config mechanism you found in INSPECT FIRST step 1 — supply an
employer/take-or-pay-specific prompt and field map. Do **not** put the voice
agent on the own-it side (it's just a redirect).

---

## Data model
New table, **do not overload** the buyer/registrations table — the schema is
genuinely different.

Suggested: `business_accommodation_registrations`
- Estate-scoped from day one (so a future estate can reuse without migration),
  but only Seafields is wired up now.
- Columns mapping the form fields above, plus standard
  created_at / id / status, following existing table conventions.
- Inbound-ready / admin-visible per existing RLS conventions. **Admin-handled:
  no agent_id / attribution column needed** on this table.

The own-it path needs **no new schema** — it reuses the existing registration
flow entirely.

---

## Acceptance checks
- [ ] Investor selecting "Own it" lands on the main Seafields registration page;
      no row written to the new table.
- [ ] Renter selecting "Rent it" sees the take-or-pay form with voice agent
      active, matching the other pages' voice UX.
- [ ] Submitting take-or-pay writes one row to
      `business_accommodation_registrations`, admin-visible, estate-scoped to
      Seafields.
- [ ] No agent attribution applied on the take-or-pay path.
- [ ] "Would also consider buying?" nudge links back to the own-it redirect.
