# Agents Role — Feature Spec

**Status:** Spec (decisions locked, pending `/plan-eng-review` to finalise schema + RLS)
**Date:** 2026-05-24
**Estates:** Seafields (lots) + Branscombe (units)
**Origin:** Uwe request relayed by Dennis — agents need their own login to manage their own buyer interests.

---

## Goal

Give external real-estate agents (e.g. Ray White's Henry Van Tiel on Seafields) their own login to a **scoped partner portal** — distinct from the admin panel — where they:

- see **their own clients'** registrations in full,
- see **every other lot/unit's status** (available / reserved / sold) but **never who** holds it,
- can **register a buyer** on a client's behalf,
- can **request a hold** on a lot (admin confirms — agents never self-allocate),
- can **enquire** about a lot's status to the admin (Uwe).

This is a **partner portal**, conceptually separate from the internal Team Admin (org/members) layer.

---

## Locked decisions (2026-05-24)

1. **Ownership = explicit `agent_id`.** A registration belongs to an agent only when `agent_id` matches. The `?ref=` QR attribution (shipped 2026-05-24, PR #1) may *propose* / pre-fill the agent, but explicit `agent_id` is the source of truth — no fuzzy company-name matching.
2. **Request-only holds, transparent state.** Agents cannot self-allocate. "Request hold" creates a **distinct, visible state** (`hold_status = pending`) that is clearly NOT a confirmed reserve. Admin sees "Agent X requested a hold (pending)"; agent sees "awaiting admin". Admin approves → real reserve; declines → clears. Fully audited.
3. **Invite-only now.** Uwe invites agencies/agents. **Self-signup is a parked TODO** for a future Uwe conversation (he leans exclusive; Dennis neutral) — invite-only is the safe default that honours Uwe's preference.
4. **Full status granularity + enquiry.** Agents see available / reserved / sold (identity still masked). Plus an **"Ask admin about this lot"** action that emails Uwe (optionally logged) so an agent can chase status without seeing who holds it.

---

## Role definition

A new **`agent`** role tier, below admin. Each agent record carries:
- `agency` (e.g. "Ray White Geraldton")
- `estate_access` (Seafields, Branscombe, or both)
- `active`, `invited_by`

Agents authenticate through the **existing Supabase auth + `/api/auth/confirm`** flow. They land on the agent portal, never the admin panel.

---

## Visibility tiers (the core rule)

| Data | Agent sees? |
|---|---|
| **Their own clients' registrations** (`agent_id = me`) | Full detail — buyer name, contact, lots/units of interest, preferences |
| **Every other lot/unit** | Status only (available / reserved / sold). **Masked:** no buyer name, no other agent, no wholesale price, no internal notes |
| **Internal admin data** | Never — pricing internals, audit log, other agencies' clients, allocation buckets |

The masking largely reuses the existing **`seafields_public_lots`** projection (already exposes status + size without identity). The agent availability view = that projection + a "this one's mine" overlay for owned clients.

---

## Capabilities

| Action | Agent | Admin |
|---|---|---|
| View own clients' registrations | ✅ | ✅ |
| View masked availability (status only) | ✅ | ✅ (full) |
| Register a buyer (tagged to their `agent_id`) | ✅ | ✅ |
| Request a hold on a lot/unit | ✅ (creates `pending`) | n/a |
| Approve/decline a hold request | ❌ | ✅ |
| Enquire about a lot's status | ✅ (emails admin) | n/a |
| Allocate / set status / pricing / stages | ❌ | ✅ |
| See other agents' clients or buyer identities | ❌ | ✅ |

---

## Data model deltas

- **`agents`** — id, name, email, agency, estate_access text[], active, invited_by, created_at, updated_at.
- **`agent_id` uuid NULL** FK on `seafields_registrations` AND `branscombe_registrations` — the ownership key.
- **Hold requests** — either columns on the lot/unit (`hold_requested_by_agent_id`, `hold_requested_at`, `hold_status`) or a `lot_hold_requests` log table (preferred for auditability + multiple requests). Maps onto the existing soft-allocation / `intent_locked` plumbing.
- **`agent_enquiries`** (optional phase 1) — id, agent_id, estate, lot_or_unit_ref, message, created_at, resolved_at. Email-to-admin acceptable for v1.
- **RLS** — agents SELECT own registrations; masked projection for all other lots/units; no write to allocation/pricing/stage.

---

## Hold-request flow (state machine)

```
agent: Request hold (lot L, client registration R)
   → hold_status = pending, hold_requested_by_agent_id = agent, hold_requested_at = now
   → admin notified (Resend)
admin: Approve  → lot becomes reserved (intent_locked to R); hold_status = approved
admin: Decline  → hold cleared; hold_status = declined; agent notified
```
Transparent throughout: pending holds render distinctly from confirmed reserves for admin, the requesting agent, and never leak identity to other agents.

---

## Seafields vs Branscombe

Identical role / visibility / ownership / hold model. Only the entity differs:
- **Seafields** = lots (bands, stages, allocation buckets — all hidden from agents behind masked status).
- **Branscombe** = units (per-unit pricing, 37 unique homes, no stages/buckets).

Both already have a public masked view + referrer fields to build on. `estate_access` scopes each agent to one or both estates.

---

## Phasing

1. **Phase 1 (Seafields pilot):** agent invite + login + agent portal chrome; "My Clients" (read); masked availability view (reuse public projection); "Ask admin" enquiry (email). Henry is the pilot agent — attribution already live.
2. **Phase 2:** agents register buyers on a client's behalf (write); hold-request flow + admin approve/decline UI.
3. **Phase 3:** Branscombe rollout; multi-agent agencies; agent performance reporting; revisit self-signup with Uwe.

---

## Parked TODOs
- **Self-signup vs invite-only** — discuss with Uwe (he leans exclusive). Invite-only shipped first.
- Multi-agent-per-agency management UI (phase 3).

---

## Phase 1 Canary — Locked Plan (eng-review 2026-05-24)

**Scope (D1): leanest canary.** Agent auth + role; **Henry manually provisioned** as the one agent; "My Clients" read-only; masked availability view; agent portal chrome. **Deferred:** invite-management UI, register-on-behalf (write), hold-requests, enquiry, Branscombe. Rationale: prove the data model + RLS masking with one real agent before building the management surface — canary-not-big-bang on a live launch DB.

**Architecture decisions:**
- **D2 — Identity: new `public.agents` table** keyed by `auth.users.id` (name, email, agency, estate_access[], active, invited_by). Separate from `admin_users` so a missed permission check can never hand an external agent admin powers. `agent_id` FK on `seafields_registrations` → `agents.id`.
- **D3 — Masking: reuse `seafields_public_lots` for availability** (already identity-free) + an **agent-scoped API** for "My Clients" filtering registrations by the logged-in `agent_id`, with **RLS on registrations as defense-in-depth**. No column-masking in RLS.
- **D4 — `agent_id` assignment: one-time backfill** of Henry's known clients (reviewed before apply) + a small **"Assign to agent" dropdown** in the admin registrations view for ongoing tagging.
- **Route group: `app/(agent)/agent/*`** with its own layout + **middleware gate that checks the `agents` table** (not `admin_users`), separate from `/admin/*`.
- **Auth: existing Supabase auth + `/api/auth/confirm`.** Canary provisioning = admin creates the auth user + `agents` row for Henry and sends a set-password / magic link. (Full invite flow deferred.)

**Build steps (Seafields canary):**
1. Migration: `agents` table + `agent_id` FK on `seafields_registrations` + RLS (agent reads own registrations only; agent has NO access to admin tables/columns). Idempotent; apply via `supabase db push`.
2. Backfill Henry's `agent_id` (reviewed SQL) + audit row.
3. Admin: "Assign to agent" control on the registrations rows (+ audit).
4. Agent portal: `(agent)` route group, layout/chrome (left nav: My Clients, Availability, Sign out), middleware gate.
5. "My Clients" page (agent-scoped API, full detail for own clients).
6. "Availability" page (reuse `seafields_public_lots`; status + size only).
7. Provision Henry; smoke-test the masking.

## Test plan (security-first — this is an access-control feature)

| Test | Asserts | Type |
|---|---|---|
| Agent cannot see other buyers' identity | Availability view returns status/size but NULL/absent allocated_to, wholesale, notes, registrant identity for non-owned lots | **CRITICAL** integration |
| Agent sees only own clients | "My Clients" returns only registrations where `agent_id = me`; zero rows for another agent's clients | **CRITICAL** integration |
| Agent blocked from admin | Agent session hitting `/admin/*` pages + `/api/admin/*` → 403/redirect | **CRITICAL** integration |
| RLS defense-in-depth | Direct PostgREST query as agent role cannot read other agents' registrations even if API is bypassed | integration |
| Backfill correctness | Only the intended Ray White registrations receive Henry's `agent_id`; count matches the reviewed set | unit/data |
| Assign control | Tagging a registration sets `agent_id` + writes an audit row | integration |

## NOT in scope (Phase 1 canary)
- Invite-management UI — deferred (manual provision for Henry); parked TODO for Uwe re self-signup.
- Register-on-behalf (agent write) — Phase 2.
- Hold-request flow (pending/approved/declined) — Phase 2.
- Status-enquiry-to-admin — Phase 2.
- Branscombe rollout — Phase 3.
- Multi-agent-per-agency — Phase 3.

## What already exists (reused, not rebuilt)
- `seafields_public_lots` masked view — backs the availability page.
- `?ref=` / referrer / `source` attribution (PR #1) — seeds the backfill + proposes future ownership.
- Supabase auth + `/api/auth/confirm` + middleware allowlist — agent auth foundation.
- Admin registrations UI — template for the "Assign to agent" control.
- `intent_locked_*` plumbing — reused when hold-requests land (Phase 2).

## Failure modes (canary)
- **RLS gap → identity leak (CRITICAL).** If the masked projection or RLS is wrong, an agent sees buyer PII. Covered by the two CRITICAL tests above; this is the gate for shipping.
- **Backfill over-tags.** A loose match assigns someone else's client to Henry. Mitigation: review the SELECT set before the UPDATE; audit row; reversible.
- **Agent reaches an admin route.** Middleware gate must check the `agents` table, not just "authenticated." Covered by the admin-block test.

## Agent onboarding & management (locked 2026-05-24 — supersedes "manually provision Henry")

Uwe controls onboarding from the admin (stays exclusive). Flow:

```
Uwe (admin) ──"Create agent" form: name, agency, email, phone, project(estate access)
   ├─ creates a PENDING agents row
   ├─ generates a single-use CODE + 14-day invite token (HMAC, AGENT_INVITE_TOKEN_SECRET)
   └─ system sends the branded invite email DIRECTLY to the agent (Resend),
      AND shows Uwe the activate link + code in admin so he can also forward it.
Agent ── clicks Activate link → /agent/activate
   ├─ enters the CODE  → validated (token matches, not expired, not used)
   ├─ sets a password  → Supabase auth user created + linked to the agents row
   └─ code consumed ──> agent portal (My Clients + Availability)
```

- **Agent fields captured at create:** name, agency, email, phone, project (estate_access).
- **Email:** system-sends-directly via Resend (verified sender) + admin shows link+code for optional manual forward. Code single-use, one per agent, 14-day expiry, regenerate/resend from admin.
- **Activation:** link + code BOTH required (code is the gate); activation sets the password.
- **Uwe can block or delete an agent (required):**
  - **Block** = set `agents.active = false` → middleware denies the agent at the gate immediately (session dead next request). Reversible.
  - **Delete** = remove the agents row AND revoke/delete the linked Supabase auth user so they can't log in; their `agent_id` on registrations is set null (registrations are not deleted).
- **Env:** needs `AGENT_INVITE_TOKEN_SECRET` (random-48) — generate at build, add to Vercel.

This replaces the canary's "manual provision" step with the real invite flow; the rest of the canary scope (read-only My Clients + masked Availability + RLS) is unchanged.
