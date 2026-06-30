# Estate Buyer Pipeline — design / build-spec

> Office-hours output, 2026-07-01. The canonical staged model every F2K estate tracks a buyer
> against, from "just registered a waitlist enquiry" to "settled". Replaces the broken 2-value
> `status` field. Decisions D1–D5 below were ratified with Dennis in this session.
> **No code yet — this is the spec to build from.**

---

## 1. The problem (the reframe)

Today the entire buyer journey is one `waitlist_registrations.status` text field with **two real
values**: `new` and `qualified`. `qualified` is set on `roi/qualification/route.ts:195` and means
*nothing more than "completed form 2"* — yet the admin dashboard labels its count "Qualified (EOI)",
conflating *registered interest* with *qualified buyer*. Worse, the Sydney cutover (2026-06-28)
seeded **24 of 25 rows to `qualified` with no form ever sent** — so the funnel stats are fiction.

Dennis's rule: **until a buyer is sent (and completes) the next step, they are NOT "qualified" to
that stage.** Two values cannot represent a real journey that runs enquiry → … → signed contract,
with a finance gate (external broker), parallel milestones, and drop-off-with-reasons at every step,
tracked **per estate**.

## 2. The model (ratified)

Two axes, plus parallel milestones — **D2: backbone + milestones**.

- **Backbone** — the linear contract path a buyer marches along. One ordered `pipeline_stage`.
- **State** — orthogonal lifecycle: `active` | `on_hold` | `withdrawn`. Any stage can be any state.
- **Milestones** — independent signals that tick in *any* order (a cash buyer is finance-qualified
  before viewing; someone views before registering). Shown as badges, not backbone columns.

### 2.1 Backbone stages (`pipeline_stage`, ordered)

| # | `pipeline_stage` | Label | Gate event that moves them in | Today |
|---|---|---|---|---|
| 1 | `enquiry` | Enquiry | Waitlist ROI lodged (interest only) | waitlist row created |
| 2 | `agent_contacted` | Contacted / agent-qualified | **Agent spoke to the buyer and judged them genuine** (D1) | — (new) |
| 3 | `form_sent` | Form sent | Qualification form emailed | `qualification_sent_at` |
| 4 | `registered` | Registered | Completed form 2 (ranked homes + indicative terms) | `registrations` insert (today's "qualified") |
| 5 | `offer` | Offer / allocation | A specific home held + price agreed in principle | — |
| 6 | `contract_conditional` | Contract signed (conditional) | Contract exchanged, subject to finance/valuation (D1) | — |
| 7 | `unconditional` | Unconditional | Conditions satisfied — **separate gate** (D1) | — |
| 8 | `settled` | Settled | Settlement complete | — |

`pipeline_stage` semantics = **furthest backbone gate reached**. Moving backward is allowed (logged)
but rare.

### 2.2 Milestones (independent, any order)

| Milestone | Field(s) | Values | Notes |
|---|---|---|---|
| **Viewed** | `viewed_at`, `viewed_mode` | `in_person` \| `guided_remote` | D1: **guided remote walkthrough counts** — non-local / FIFO / interstate buyers an agent walks through the website. |
| **Finance** | `finance_status` (+ broker fields, §4) | `unknown` \| `cash` \| `preapproved` \| `needs_finance` \| `in_assessment` \| `qualified` \| `declined` | The real "qualified buyer" gate. Managed via referral (§4). |
| **Holding deposit** | `holding_deposit_at`, `holding_deposit_amount` | — | ⚠️ **OFF by default per estate** (§6 legal). Refundable reservation, not a contract. |

Business rule (soft): the backbone shouldn't advance to `offer` until `finance_status` is at least
`in_assessment`. Enforced as a warning, not a hard block (agents know exceptions).

### 2.3 State + exit

`pipeline_state`: `active` (default) | `on_hold` | `withdrawn`.

A `withdrawn` buyer records, automatically, the **`exit_stage`** = the backbone stage they were at,
plus an **`exit_reason`** (picklist below) + free-text `exit_note`. `on_hold` may carry a reason too
(e.g. timing) but doesn't require the full taxonomy.

## 3. Drop-off taxonomy (D4)

Fixed `exit_reason` codes (the slices in the per-estate drop-off report). `other` + note always
available for the long tail.

- `price_too_high` — Price / budget too high *(D4)*
- `finance_declined` — Finance declined / couldn't qualify *(D4; ties to the finance milestone)*
- `timing` — Timing not right (keep-warm, not dead) *(D4)*
- `home_unavailable` — Lost the specific lot/home they wanted *(D4, split)*
- `location_unsuitable` — Location/product didn't suit after viewing *(D4, split)*
- `chose_competitor` — Went with another estate / builder
- `went_cold` — Lost contact / no response
- `changed_plans` — Personal circumstances changed
- `other` — free-text note required

## 4. The finance gate (D3 — refer + track; managed advisor directory)

"Qualifies for finance" needs an external mortgage broker / financial advisor / credit check — F2K
doesn't do it. Model (refined 2026-07-01, Dennis):

- **A managed broker/advisor directory** — an admin CRUD section that mirrors `/admin/agents`
  (add / edit / delete), holding both **mortgage brokers and financial advisors** (one directory,
  a `type` tag distinguishes them). It is a *directory only* — **no login, no invite, no portal**
  for brokers/advisors (that's deferred scale infra), so it's the agents UI minus the auth/invite/
  estate-access machinery.
- **Admin nominates an advisor per client.** On a buyer who is `needs_finance`, admin picks an
  advisor from the directory (`nominated_advisor_id`), which logs a **referral** `pipeline_events`
  row (and optionally emails the advisor).
- The agent/admin then updates `finance_status` (`in_assessment` → `qualified` / `declined`) after
  the advisor reports back. On `declined`, capture the reason → feeds drop-off `finance_declined`.
- Optionally capture `finance_conditional_amount` / LVR for qualified buyers.

This gives F2K a **finance-referral relationship it owns** (a named panel it controls), not just a
self-reported free-text flag.

## 5. Data model (D5 — spine on existing rows + events table)

Put the spine on `waitlist_registrations` (already one-per-buyer-per-estate = the journey origin).
`registrations` stays as the completed-form artefact hanging off it. Reuses the cross-portal pattern
that `qualification_sent_at` already proved.

**`waitlist_registrations` — new columns:**
- `pipeline_stage text` (enum-checked, default `enquiry`)
- `pipeline_state text` (default `active`)
- `exit_reason text`, `exit_note text`, `exit_stage text`
- `viewed_at timestamptz`, `viewed_mode text`
- `finance_status text` (default `unknown`), `nominated_advisor_id uuid` (FK → `advisors`),
  `finance_conditional_amount numeric`
- `holding_deposit_at timestamptz`, `holding_deposit_amount numeric`
- (keep `qualification_sent_at` / `_by` — they back the `form_sent` gate)

**`pipeline_events` — new append-only table (the timeline + the documentation):**
`id, estate_id, waitlist_id, event_type (stage_change|state_change|milestone|finance|note),
from_value, to_value, reason_code, note, actor_type (agent|admin|system|buyer), actor_id, actor_email,
created_at`. RLS on; agents see only their own buyers' events; nothing is ever overwritten.

**`advisors` — new directory table (admin-managed, no auth):**
`id, name, firm text, type text (mortgage_broker|financial_advisor), email, phone, active bool
default true, notes text, created_at, updated_at`. Admin CRUD at `/admin/advisors`, mirroring
`/admin/agents` **minus** `auth_user_id` / invite tokens / `estate_access` (no portal). Referenced
by `waitlist_registrations.nominated_advisor_id`; deleting an advisor keeps past referrals
(nullify the FK, keep the `pipeline_events` history).

**Per-estate config** (on `estates` or a small `estate_pipeline_config`):
`holding_deposit_enabled bool default false`, `holding_deposit_terms_version text`. Lets us ship the
optional gate OFF everywhere and switch it on per estate once legal wording exists.

**Stage = derived-and-stored:** `pipeline_stage` is stored for fast board/funnel reads, and every
change writes a `pipeline_events` row, so the stored value is always reconstructable from history.

## 6. Legal flags (do NOT guess)

- **Holding deposit** — every public page says *"Registration of interest only — no deposit required
  or accepted."* A reservation deposit is legal in AU but **state-specific** (WA/SA/TAS differ): must
  be genuinely refundable, not a contract, with disclosure. Ships **OFF**; enable per estate only
  after that estate's wording is signed off. Dennis's action.
- **EOI banner** — unchanged for stages 1–5; the conditional/unconditional/settled stages are
  post-contract and outside the "interest only" framing.
- **Finance** — F2K refers but gives no financial advice; the referral wording must say so.

## 7. Surfaces to build

**Admin — pipeline board per estate** (replaces/augments the ROI Waitlist page):
- Columns = the 8 backbone stages; cards = buyers; badges = milestones (viewed / finance / deposit);
  withdrawn + on-hold filterable.
- Per-buyer drawer = the `pipeline_events` **timeline** (the per-buyer documentation Dennis asked for).
- Advance / move-back / withdraw / hold actions; withdraw + hold prompt for reason; finance update
  sets the milestone + logs the event.
- **Rename the misleading "Qualified (EOI)" stat** to honest stage counts.

**Admin — broker/advisor directory** (`/admin/advisors`, new nav item under Agents) — CRUD over the
`advisors` table, mirroring the agents section minus auth/invite. Add/edit/delete brokers + advisors,
toggle active, set `type`. This is where Dennis populates the panel.

**Agent portal** — agents act on their *own* buyers: mark contacted, mark viewed, send form (exists),
update finance, withdraw-with-reason. Same shared signal admin sees (the proven pattern). Advisor
*nomination* stays admin-only (agents don't pick the panel).

**Analytics / Reports** — per-estate **funnel** (count + conversion % between each backbone stage) and
**drop-off report** (`exit_stage` × `exit_reason`). Feeds the existing Analytics/Reports surfaces; the
generic report builder can query the spine.

## 8. Data cleanup (the mis-seeded rows)

A guarded backfill, each change logged as a `system` `pipeline_events` row (auditable + reversible):
- `status='qualified'` + has a `registrations` row → `pipeline_stage='registered'`.
- `qualification_sent_at` set, no registration → `form_sent`.
- `status='qualified'`, no form sent, no registration (the mis-seed) → **back to `enquiry`**.
- `status='new'` → `enquiry`.
- Drop / retire the old `status` reads after the board ships.

## 9. Build phases (incremental, review each)

1. **Migration** — columns + `pipeline_events` + per-estate config + the §8 cleanup backfill.
2. **Admin pipeline board** + per-buyer timeline; rename the stat.
3. **Agent portal** stage actions (extend the existing waitlist panel).
4. **Finance** refer+track — the `/admin/advisors` directory (CRUD) + per-client nomination + status
   fields + events + decline reason.
5. **Analytics** — funnel + drop-off per estate.
6. **Deferred** — holding-deposit per-estate legal enablement; broker portal (only if volume warrants).

## 10. Open items / assignments (Dennis, non-code)

- **Holding-deposit legal wording** per state (WA/SA/TAS) before stage 8 is enabled anywhere.
- ~~Confirm the broker/advisor panel~~ → resolved: a managed `/admin/advisors` directory you
  populate yourself (build item, §4/§7). No longer a pre-build blocker.
- **Agent vs admin permissions** on withdraw/back-step — default: agents set reasons on their own
  buyers, admin can override/move anyone. Confirm if you want it tighter.
