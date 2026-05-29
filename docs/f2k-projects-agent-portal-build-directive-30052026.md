# Build Directive — Agent Portal: Live Grid, Admin Preview, Unassigned Handling

**App:** f2k-projects (Vercel + Supabase)
**Author:** Dennis McMahon
**Status:** approved to build

---

## Operating principles (apply throughout)

1. **Audit before writing.** Before changing anything, map the current agent portal (My Clients), the admin Agents page, and the registration→agent assignment path. Report what's there before proposing schema changes.
2. **Schema is additive.** New columns/tables fine. Renaming or dropping existing columns requires explicit sign-off from Dennis.
3. **Every state change goes through the audit log.** No silent updates to assignment, status, or ownership — ever.
4. **Privacy is enforced server-side, not in the UI.** Every agent-scoped read (grid and export) must filter by agent ownership in the query / RLS, never by hiding rows client-side. An agent must not be able to reach another agency's data via the API or the export.

---

## Workstream 1 — Agent live grid + export ("the spreadsheet, in the product")

Replace the card list on the agent portal's **My Clients** page with a live, working table.

- **Source:** reads the registrations table directly, scoped server-side to the logged-in agent's own linked buyers. Always current — a newly referred/assigned buyer appears with no manual step.
- **Columns:** buyer name, email, phone, lot(s), stage, buyer type, timeline, status, date registered.
- **Interactions:** sort on any column; filter by lot / stage / status; search by name.
- **Granularity:** one row per registration to start (matches the admin table — e.g. Macie appears 3×, one per lot). Build so we can switch to one-row-per-buyer (lots collapsed into a cell) later without a rewrite.
- **Export:** a single **Export CSV / XLSX** button that dumps the *current filtered view*. The export endpoint must run through the **same server-side ownership filter** as the grid. The grid is canonical; the export is a snapshot.

Acceptance: logged in as Henry, the page shows exactly his linked buyers, sortable/filterable, and export returns only those rows.

---

## Workstream 2 — "View as agent" (admin) + Agents page reformat

### 2a. View as agent
On the admin **Agents** page, add a **View as agent** action on each agent row.

- Opens a **read-only preview of that agent's actual portal** — the My Clients grid (Workstream 1) plus masked lot availability — exactly as that agent sees it.
- **Critical:** render the *real* agent-portal components keyed to the selected agent's id inside a preview wrapper. Do **not** rebuild a separate "admin copy" of the view — the preview must be the live component so it can never drift from what the agent actually sees.
- Read-only: no status changes or assignments can be made from inside the preview.
- **Audit-logged:** each open writes an entry, e.g. "admin {name} viewed agent {name} portal".

### 2b. Reformat the Agents page
Render agents as a clean table — columns: name, agency, project tag, status, client count, actions (View / View as agent / Edit / Block / Delete). Replace the current stacked text layout. The expanded per-agent client list should render using the same grid component from Workstream 1.

Acceptance: from the Agents page, "View as agent → Henry" shows Henry's five current registrations rendered identically to his own portal, read-only, with an audit entry written.

---

## Workstream 3 — Unassigned registration handling

**Decision (approved — do not auto-assign unassigned buyers to any selling agent):**

1. **Direct / House owner.** A registration with no referrer gets an explicit owner value of **"Direct / House"** — an honest "no external agent" state. Do **not** silently assign it to Uwe's (or any) agent record. Attribution must stay truthful.
2. **Alert on landing.** The moment a registration lands with no agent, **alert Uwe (admin)** — email and/or an Inbox / dashboard flag — so it is triaged, never orphaned.
3. **Claim / reassign.** From that alert (and from the registration row), Uwe can **claim it to his own Property Friends agent record** (if it's genuinely his dealing) or **reassign to another agent**, in one click. The assignment is **audit-logged**.

Do **not** build an auto-assign-to-Uwe catch-all as the default. (If we later want one, it would be a Settings toggle, off by default — not in scope now.)

Acceptance: a new no-referrer registration shows owner "Direct / House", triggers an admin alert to Uwe, and can be one-click claimed/reassigned with an audit entry.

---

## Sequencing

The agent↔buyer link already writes and surfaces correctly on both ends (admin Agents page and agent portal), so Workstream 1 is largely presentation over data that's already flowing. Suggested order: **1 → 2 → 3**. Each can ship independently.

## Test pass before handing to agents

- Henry via **View as agent**: five rows render cleanly, only his buyers, export returns only his rows.
- Privacy: the one direct registration (Chintan Shah, L338) appears in **no** agent's grid or export.
- Unassigned: create a test no-referrer registration → confirm "Direct / House" + Uwe alert + one-click claim, all audit-logged.
