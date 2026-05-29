# UPDATE — Agent Portal Build Directive (Sync Scope)

**Supersedes:** the data-sync / spreadsheet-integration portion of the original agent-portal spec already produced by OpenCode.
**Unchanged:** Workstreams 1 (agent live grid + export), 2 (View as agent + Agents page reformat), and 3 (Direct/House + alert + claim for unassigned). Those stand as specced.
**Author:** Dennis McMahon
**Status:** approved — apply before building any sync layer.

---

## What changed

The original plan moved toward a **two-way sync** between the F2K portal and each agent's own spreadsheet/database (Google Sheets and Microsoft/Excel), with write-back of agent-modified fields into the portal, conflict handling, and a cron/webhook sync engine.

**Drop all of that.** Build a **one-direction, pull-only live feed** instead. Specifically, do **not** build:

- any write-back of agent data into the F2K portal;
- any OAuth/token storage granting F2K write access into agents' Google or Microsoft accounts;
- Microsoft Graph / Google Sheets *write* integration;
- conflict resolution, last-write-wins logic, or row-merge reconciliation;
- a bidirectional sync engine, sync-now-both-ways button, or 15-minute two-way cron.

---

## Why (read this — it's the reason the scope collapsed)

The two-way design existed to carry agents' own workflow data (call notes, follow-up dates, ratings, deposit status) *back* into the portal. That requirement is now confirmed void:

**F2K does not want the agents' workflow data, and the agents do not want F2K to hold it.**

Once nothing needs to flow *back*, every hard part of the original sync plan disappears — there's no shared-writable field, so there is no conflict to resolve; no write-back, so no OAuth into enterprise accounts (which Ray White / LJ Hooker corporate IT would likely refuse anyway); and no data-custody liability for F2K holding third-party client-management notes. The clean design is also exactly what the agent asked for: a spreadsheet that's always current with no manual re-keying.

The boundary between the two datasets is not a constraint to engineer around — it is the intended design, and it is what both sides want.

---

## What to build instead

**Field ownership (the governing rule):**
- **Product-owned fields** — name, email, phone, lot(s), stage, buyer type, timeline, status, date, **Registration ID**. The portal is canonical. These flow **out only** (portal → agent), read-only to the agent.
- **Agent-owned fields** — the agent's custom columns (notes, follow-up, rating, etc.). These live **only** in the agent's own sheet/system, on their infrastructure. The portal never sees, stores, requests, or writes them.

No field is writable on both sides. There is no inbound path from agent systems.

### Now (fold into the current grid/export build, Workstream 1)
- Add a **stable, immutable `Registration ID`** (and buyer ID) to the grid and export schema. This is the join key agents use to attach their own columns. Ship it even before the feed exists — it future-proofs manual XLOOKUP/joins too.
- Define the product-owned column set explicitly as above.

### Phase 2 — tokenised per-agent read-only live feed
- A **per-agent feed URL** (CSV and/or JSON) exposing only that agent's own linked buyers' product-owned fields.
- **Tokenised and revocable:** the token resolves server-side to one agent's buyers only; **Block** kills the feed instantly (same wall as the portal — no client-side filtering).
- Agents connect their own sheet to it, once:
  - **Google Sheets:** `IMPORTDATA` / `IMPORTRANGE` against the feed URL — auto-refreshes.
  - **Excel:** Power Query → From Web → refresh on open or scheduled.
- Their custom columns sit beside the pulled data, joined on Registration ID, **never overwritten** because the feed only ever delivers product-owned columns.
- Deliverable alongside: a one-page **"Connect your sheet"** guide (Excel Power Query + Google Sheets IMPORTDATA).

A read feed simply refreshes — there is no sync *engine* to build, no schedule to manage on our side, and no conflict surface.

### Known limit to state up front
A feed cannot reach a **local .xlsx on a desktop** — no API exists for a file on someone's laptop. Agents must use a cloud sheet (Google Sheets, Excel Online/OneDrive/SharePoint) for live refresh. Flag this so it isn't expected.

---

## Net effect on the original spec

Keep Workstreams 1–3. Replace the entire sync section with: stable Registration ID now + tokenised pull-only feed in Phase 2. Everything concerning write-back, two-way sync, Microsoft/Google write integration, conflict handling, and sync scheduling is removed from scope.
