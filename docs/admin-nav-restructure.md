# Admin nav restructure — State→Location→Estate (decision locked 2026-06-16)

## Problem
`src/components/admin/AdminSidebar.tsx` is a flat, hardcoded list grouped by estate. ~24 links
across 4 estates today; **every new estate adds another ~5-item group** → unbounded growth. Routes
are also inconsistent (`/admin/seafields-lots`, `/admin/estates/seafields/posts`,
`/admin/wavecrest/posts` are three shapes for the same thing).

## Decision
**Estate switcher + consistent, registry-driven sub-nav.** Chosen over a collapsible accordion
(still grows one row per estate) and over "do nothing." Sidebar length stays constant at any estate
count; new estates appear automatically from the `estates.ts` registry.

## Structure

```
GLOBAL (estate-independent, fixed)
  Dashboard
  Analytics            <- cross-estate comparison dashboard (FTK analytics Phase 1 lives here)
  All Registrations
  Agents
  Compliance           (Email Templates, Audit Log)
  Settings

ESTATE  [ Seafields ▾ ]   <- picker grouped State → Location → Estate, generated from estates.ts
  Overview
  Lots / Units           <- label + presence depends on estate archetype
  Stages
  Registrations
  Blog / Media / Import
  (estate-type extras, e.g. Hemp Homes: Journey, Prospects, Outreach)
```

- **Global vs per-estate split.** Cross-estate things stay top-level. The new **Analytics**
  dashboard is the "all estates side by side" view, so it sits in GLOBAL, not under one estate.
- **Switcher is registry-driven.** The picker's State→Location→Estate tree is built from
  `src/data/estates.ts` (already the single source of truth — same registry the analytics adapter
  extends). Add an estate to the registry → it appears in admin (and public nav) with no nav edit.
- **Section sets are archetype-aware.** Estates differ: Seafields = lots/stages; Branscombe =
  units; Hemp Homes = journey/prospects/outreach (no lots). The registry declares each estate's
  sections (or derives them from its archetype — ties to the estate-archetype-pipeline work), so
  the sub-nav renders only the sections that estate has.

## Route standardisation → `/admin/estates/[slug]/[section]`

| Current | Target |
|---|---|
| `/admin/seafields-stages` | `/admin/estates/seafields/stages` |
| `/admin/seafields-lots` | `/admin/estates/seafields/lots` |
| `/admin/seafields-import` | `/admin/estates/seafields/import` |
| `/admin/seafields-employer-campaign` | `/admin/estates/seafields/employer-campaign` |
| `/admin/estates/seafields/posts` · `/media` | already conformant (keep) |
| `/admin/branscombe-units` | `/admin/estates/branscombe/units` |
| `/admin/wavecrest/posts` · `/media` | `/admin/estates/wavecrest/posts` · `/media` |
| `/admin/wavecrest-stages` · `-lots` · `-import` | `/admin/estates/wavecrest/{stages,lots,import}` |
| `/admin/hemp-homes/{posts,media,journey,prospects,outreach/queue}` | `/admin/estates/hemp-homes/…` |

Add redirects (or keep the old routes as thin re-exports) so existing bookmarks/links don't 404.

## Sequencing (relative to FTK analytics)
- **FTK analytics Phase 1 does NOT block on this restructure.** It ships the **Analytics** item in
  the *current* sidebar's global area (eng-review task T9). The restructure keeps Analytics in
  GLOBAL when it lands.
- **This restructure is its own piece** — it's a route migration across ~15 admin pages plus a new
  switcher component. Worth its own `/plan-eng-review` (route migration + redirects) and
  `/plan-design-review` (switcher UX) when built.

## Interaction & responsive spec (design review, 2026-06-16)

**Picker control — two-step drill-down (decided):** `[ State ▾ ] → [ Estate ▾ ]`. Each list stays
short and the hierarchy is explicit. Mitigations for the two-click cost: **remember the last-used
state** (so working within one state is one click), and cross-estate *comparison* never goes through
the switcher — it lives in the GLOBAL **Analytics** view, so the slower cross-state switch only
happens on genuine context changes. (Considered: searchable combobox, native grouped `<select>` —
drill-down chosen for short lists + explicit hierarchy.)

**Switch-estate-mid-task:** switching the active estate lands you on the **same section if the target
estate has it, else its Overview** (archetype-aware — e.g. on Seafields ▸ Lots, switch to Hemp Homes
which has no Lots → land on Hemp Homes ▸ Overview, not a dead link). The active estate persists via
the URL (`/admin/estates/[slug]/[section]`), so navigating sections keeps the estate fixed.

**Wayfinding:** breadcrumb `Estates / [State] / [Estate] / [Section]` at the top of every per-estate
page; the switcher shows the active estate; the active section is highlighted in the sub-nav. (The
"trunk test": cover everything but the nav and you still know which estate + section you're on.)

**Responsive (global RESPONSIVE rule):** desktop = persistent left sidebar; **mobile = hamburger
(top-left) → drawer** with the *same* items; the two-step picker renders as two **full-width**
controls in the drawer; **44px touch targets, 16px+ text**; GLOBAL items reachable with a thumb.
Active-route indicator survives the collapse.

**Archetype-aware sections + empty states:** render **only the sections an estate actually has**
(Seafields: Overview/Lots/Stages/Registrations/Blog/Media/Import; Hemp Homes:
Overview/Journey/Prospects/Outreach; Dutton (concept): Overview/Registrations — no Lots yet). A
section that exists but has no data yet shows a **warm empty state with a primary action**, never a
"No items found" dead end or a 404. The section set is declared per estate in the registry (or
derived from its archetype — ties to the estate-archetype-pipeline work).

These defaults were baked during the design review (operator focused the review on the picker);
veto any in the eng review.

## Also applies to the public nav
The same registry-driven State→Location→Estate hierarchy replaces the flat public top nav (parked
TODO). Same `estates.ts` source; build alongside or right after the admin switcher.

---

## Implementation Tasks
Synthesized from the design review. P1 blocks ship; P2 same branch; P3 follow-up.

- [ ] **T1 (P1, human: ~3h / CC: ~25min)** — `EstateSwitcher` — two-step State→Estate drill-down (remember last state; reads `estates.ts` grouped by State/Location)
  - Surfaced by: Pass 1 — picker control decision
  - Files: `src/components/admin/EstateSwitcher.tsx`
- [ ] **T2 (P1, human: ~3h / CC: ~25min)** — sidebar — restructure `AdminSidebar` into a fixed GLOBAL section + switcher-driven per-estate sub-nav (replaces the flat ~24-link list)
  - Files: `src/components/admin/AdminSidebar.tsx`
- [ ] **T3 (P1, human: ~3h / CC: ~30min)** — routes — standardise admin estate routes to `/admin/estates/[slug]/[section]` + redirects from old flat paths (`seafields-lots` etc.)
  - Files: `src/app/admin/estates/[slug]/...`, redirects for old routes
- [ ] **T4 (P2, human: ~1h / CC: ~10min)** — registry — declare archetype-aware section sets per estate (drives which sub-nav items render)
  - Files: `src/data/estates.ts`
- [ ] **T5 (P2, human: ~1.5h / CC: ~15min)** — wayfinding — breadcrumb `Estates / State / Estate / Section` + active estate/section indication; switch-mid-task lands on same section else Overview
  - Files: `src/components/admin/` (breadcrumb), `AdminSidebar`
- [ ] **T6 (P2, human: ~1h / CC: ~10min)** — responsive — mobile drawer: two-step picker full-width, 44px targets, 16px text, thumb-reachable GLOBAL items
  - Files: `src/components/admin/AdminSidebar.tsx`
- [ ] **T7 (P2, human: ~2h / CC: ~20min)** — empty states — warm empty state (primary action) for sections with no data yet; never a dead link/404
- [ ] **T8 (P3, human: ~2h / CC: ~20min)** — public nav — apply the same State→Location→Estate hierarchy to `ProjectsHeader.tsx`

## NOT in scope (design review)
- Searchable-combobox / native-`<select>` picker variants — drill-down chosen instead.
- AI image mockups — skipped: this is an IA exercise, ASCII structure mocks suffice.
- Public-nav restructure detail — captured as T8, designed when built.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | (decision originated here; full eng review pending) |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR | score 5/10 → 8/10; picker decided (two-step drill-down); interaction/responsive/states specced |

- **VERDICT:** DESIGN CLEARED — nav restructure design-complete enough to build; recommend `/plan-eng-review` before implementing (route migration + redirects need architecture validation).

NO UNRESOLVED DECISIONS
