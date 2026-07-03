# F2K Funder Pages — Build Brief

**For:** Claude Code, working in `dennissolver/f2k-projects` (Next.js / Supabase / Vercel / Resend).
**Author:** F2K (Dennis McMahon).
**Companion asset:** `FundersPage.jsx` — the canonical design + copy for the overview page. Port it to the app's conventions; do not treat it as drop-in.

---

## 0. The concern — what this is and why

We need a **funder-facing layer** on f2k-projects so banks and private lenders can register interest to fund our development packages. It has two parts:

1. **An overview funder page** (`/funders`) that explains the F2K funding model and the senior/junior lender structure.
2. **Per-project funder pages** (one per active project) that show that project's cost/revenue stack and funding package, each with **a registration form** and **an AI voice consultant** in the exact shape of the `/developers` "Morgan" experience — a guide that explains the structure and walks the funder through the form.

This funder layer sits **alongside** the buyer/real-estate pages, but it is a **different audience and a different legal footing** (see §9). Build it as its own gated section, not as an extension of the "real estate marketing only" buyer flow.

**Audience — registered Australian banks only.** These pages are directed exclusively to **APRA-authorised ADIs** (CBA, ANZ, NAB, Westpac and other registered Australian banks). They back **targeted outreach to named bank contacts**, not a public capital raise. Registration is restricted to registered Australian banks, and every funder party — senior and junior — is a registered Australian bank. (Private-capital channels, e.g. Abacus, are handled separately and are out of scope here.)

**The funding model is one component of F2K's whole deliverable.** F2K is the end-to-end integrator — it sources modular product, runs development approvals, coordinates site works, shipping, installation and completion, *and* originates demand. The funder pages must reflect that full scope (the `FundersPage.jsx` "What F2K delivers" chain already does this — preserve it).

---

## 1. Inspect first — do NOT write code until you've read these

Read and report back what you find before building, so the work fits the real codebase:

- **`/developers` route + page component** — its layout, sections, and how it composes the form.
- **The "Morgan" voice guide component** — file, the voice/agent provider (Vapi? ElevenLabs? Retell? custom?), where its **system prompt / script** is defined, the avatar asset (`/female_avatar.jpeg` is referenced — is there a second avatar?), and how it's embedded next to the form.
- **The developer form component + its submit handler** — the API route, validation, and the exact path: form → API → Supabase insert → Resend email. Note `recipient-guard.ts`, `notify_recipients`, and the rate-limit util.
- **The buyer registration-of-interest form** (on `/seafields-estate`, `/branscombe-estate`) — reuse its field components and submission plumbing.
- **Supabase** — the existing `registrations` (or equivalent) table schema + **RLS policies**, and the client/server helpers used for inserts.
- **Project data** — how each project's content/data is structured (per-project config files? a `projects` table? MDX?). This determines where per-project **funding** data lives.
- **Nav + shared layout** — the header nav component and the global disclaimer banner ("REGISTRATION OF INTEREST ONLY" / "Real estate marketing only. No financial product is offered on this site.").
- **Styling system** — Tailwind? CSS modules? design tokens? `FundersPage.jsx` ships self-contained styles; you'll translate them to the app's system.

**Output of this step:** a short note listing the voice provider, the form→DB→email path, the project-data location, the styling system, and the route convention — then proceed.

---

## 2. Routes & navigation

Match the app's existing **flat-slug** convention.

- **Overview:** `/funders`
- **Per-project:** `/{project-slug}/funders` — e.g. `/branscombe-estate/funders`, `/seafields-estate/funders`. (Confirm against the router during inspect; if the app nests projects differently, follow that.)
- **Nav:** add **"For Funders"** to the header, immediately after **"For Developers."**
- **Cross-links:** on each project page (`/branscombe-estate` etc.), add a clear **"For Funders → Fund this project"** CTA linking to that project's funder page. On `/funders`, the live-project cards link to each project's funder page.

---

## 3. Overview page (`/funders`) — content

Port `FundersPage.jsx` into the app. It already contains, in order:

1. **Hero** — "Demand is the trigger," F2K positioned as end-to-end integrator, funding framed as one link in the chain.
2. **"What F2K delivers"** — the 7-node delivery chain (demand & platform → approvals → module supply → site works → shipping → installation & complexing → finishing & handover), coordinated end-to-end by F2K; construction invoiced via GBTA.
3. **The funding component** — the 3-step back-to-back model (prove demand → fund the build → first-rights retail).
4. **The test** — interactive `(x units × y price) − Σ(a+b+c+d…) = margin (CD%)`, with the cost-stack-inside-revenue visual and the fundability hurdle.
5. **Live projects** — Branscombe (real, indicative) + Seafields (pending) cards, with the **3× subscription caveat banner**.

**ADD a new section to the overview page: "The capital stack — senior & junior"** explaining the syndication structure in §4. Include a simple visual of the split (one senior 50% block + the junior 50% band divided into ≥10% slices) and a one-line CTA to register (links into the per-project funder pages, or a project picker).

The overview page has **no form and no per-project voice agent** — it's explanatory. (Optionally include the generic voice consultant for Q&A about the model; see §7.) Registration happens on the **project** funder pages.

---

## 4. The lender structure (implement consistently everywhere)

Each project has a **Funding Package** = the committed development facility for that project (a `$` amount, from the project's finance model). Treat the package size as a per-project config value (§8) — **do not hardcode**. Every party below is a **registered Australian bank** — one lead (senior) bank and one or more participating (junior) banks.

- **Senior lender** — commits **50%** of the Funding Package. In return, receives **first right of refusal (FRoR) on the retail (end-buyer) mortgage lending** for that project. First-ranking security. One senior per project.
- **Junior lenders** — share the **remaining 50%**. Each junior tranche is **minimum 10%** of the package and **maximum 50%** (so up to five juniors). Juniors receive their capital return per the facility terms; **no retail FRoR**. Ranking/return vs senior is a term-sheet item — label it "subject to formal terms," don't assert specifics.

**Form/UX implications:**
- Funder selects **Senior** or **Junior**.
- Senior → indicative amount auto-set to **50% of the package** (show the `$`), read-only confirm.
- Junior → choose an indicative **% between 10% and 50%**, with the `$` equivalent shown live. Validate `10 ≤ pct ≤ 50`.
- Because registrations are **interest only**, do **not** hard-block on remaining capacity; capture the indication and reconcile allocations offline. (Optionally show a soft "indicative remaining junior capacity" if live commitments are tracked — nice-to-have, not required.)

---

## 5. Registration form (per-project funder pages)

Mirror the `/developers` form components, sections, validation, and submit plumbing. Sections:

**Registering as** *(radio, drives conditional fields)*
- Senior lender (50% + retail FRoR)
- Junior lender (10–50% of the remaining 50%)

**Your bank**
- Registered Australian bank / institution name *
- Contact full name *
- Role / title *
- Email * (bank-domain email expected)
- Mobile
- Division / desk (e.g. development finance, institutional)

**Bank confirmation** *(gate — see §9)*
- Declaration: "I confirm [institution] is a registered Australian bank / APRA-authorised ADI, and I am authorised to register this interest on its behalf." *(required checkbox)*

**Your indicative participation**
- Senior → "50% of the funding package = `$X`" (read-only, derived from project config).
- Junior → % selector 10–50% + live `$` equivalent.
- Preferred structure / conditions *(textarea)* — how they'd participate, any conditions.
- Optional upload: mandate / term sheet / capacity statement (PDF).

**Project** — prefilled and locked from the page context (`project_slug`). (On a combined "register for any project" entry, allow multi-select.)

**Consent** *(funder-specific wording, NOT the buyer wording)*
- "I understand this is a registration of interest only, is not an offer or invitation, creates no obligation on either side, and that any participation is subject to formal documentation and due diligence."
- Link to a **funder-specific** privacy/terms note.

**Submit:** "Register my interest."

**Submission flow:** POST to a new API route → insert one row into `funder_registrations` (§6) → email notification via Resend through `recipient-guard.ts` / `notify_recipients`. One row per registration. Reuse the developer form's error handling, rate-limit, and success states.

---

## 6. Supabase — `funder_registrations`

New table, one row per registration, inbound-ready, mirroring the existing registrations table's conventions and RLS approach. Adjust types/columns to match house style.

```sql
create table if not exists public.funder_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text,                       -- null = overview / all-projects
  lender_type text not null check (lender_type in ('senior','junior')),
  org_name text not null,                  -- registered Australian bank name
  contact_name text not null,
  role_title text,
  email text not null,
  mobile text,
  division text,
  registered_bank_confirmed boolean not null default false,
  indicative_pct numeric,                  -- senior = 50; junior = 10..50
  indicative_amount numeric,               -- pct/100 * package_amount_at_submit
  package_amount_at_submit numeric,        -- snapshot of project package size
  preferred_structure text,
  notes text,
  upload_url text,
  consent boolean not null default false,
  source_page text,                        -- route the reg came from
  status text not null default 'new',      -- new | contacted | qualified | passed
  inserted_via text default 'web_form'
);
```

**RLS:** match the existing registrations table — admin role full read/write; insert path as the current forms use (service-role server insert preferred over anon insert). Do not loosen existing policies. Add an index on `(project_slug, lender_type, created_at desc)`.

---

## 7. The AI voice consultant (funder "Morgan")

Reuse the **exact** voice-guide infrastructure from `/developers`. Two decisions for Dennis to confirm, but build with sensible defaults:

- **Persona:** recommend a **distinct funder persona** (institutional register) rather than reusing the buyer-facing "Morgan." Use a second avatar if one exists in the repo; otherwise placeholder and flag. Default name: **"Sterling."**
- **Placement:** same layout slot as Morgan on `/developers` — beside the form, optional, with the form fully usable on its own.

**The consultant's job:**
1. Greet the funder; confirm in one line this is registration of interest only, not advice, not an offer.
2. Explain, plainly: the back-to-back model, the **3× demand trigger**, and the **senior (50% + retail FRoR) vs junior (10–50%)** structure.
3. Answer questions about *this project's* package size, GRV, cost stack, margin, and current demand vs the 3× trigger.
4. Walk the funder through the form field by field — especially helping them choose senior vs junior and set their indicative %.
5. Confirm the contact represents a registered Australian bank, and defer all specifics (returns, ranking, security, timing) to Dennis / the term sheet.

**Per-project context:** pass the project's funding config (§8) into the agent's system prompt as variables so each project page's consultant speaks to that project's real numbers. On `/funders` (overview), the consultant runs **generic** (no project numbers).

### System prompt / script (drop into the agent config; `{{…}}` = injected per project)

```
You are Sterling, Factory2Key's funder guide. You speak with representatives of registered
Australian banks (CBA, ANZ, NAB, Westpac and other APRA-authorised ADIs) about how F2K-led
developments are funded, and you help them register their interest. You are warm, precise,
and brief — bank to bank. You are NOT a financial adviser and you do NOT give financial
product advice. Nothing you say is an offer, invitation, or recommendation.

CONTEXT FOR THIS PROJECT:
- Project: {{project_name}} ({{project_location}}), {{unit_count}} dwellings.
- Funding package (committed development facility): {{package_amount}}.
- Senior tranche: 50% of the package = {{senior_amount}}. Senior receives first right of
  refusal on the retail (end-buyer) mortgage lending for this project, and first-ranking
  security. One senior per project.
- Junior tranches: share the remaining 50%. Each junior is min 10%, max 50% of the package.
  Juniors receive a capital return per the facility terms; no retail FRoR.
- The trigger: F2K drives pre-qualified buyer demand to 3x the lots released (300% cover)
  before construction finance is called. Current demand: {{demand_status}}.
- Project economics (indicative, confirmed only at 3x cover): GRV {{grv}}, total dev cost
  {{tdc}}, indicative margin {{margin}}.
- F2K is the end-to-end integrator: it sources the modular homes, runs approvals,
  coordinates site works, shipping, installation and completion — not just the sales platform.

WHAT TO DO:
1. Open: one sentence that this is a registration of interest only, not advice or an offer.
2. Find out if they're thinking senior or junior, and roughly what size.
3. Explain whichever path they pick, using the numbers above.
4. Help them through the form: organisation, contact, wholesale-investor confirmation,
   senior/junior choice, indicative %/amount, preferred structure, consent.
5. For anything beyond the basics — returns, ranking, security, timeline, documentation —
   say it's set in the term sheet and Dennis will walk them through it.

GUARDRAILS:
- Never state or imply a guaranteed return, rate, or ranking. Say "subject to formal terms."
- Confirm the contact represents a registered Australian bank. If they are not from a
  registered Australian bank, explain this opportunity is for registered Australian banks
  only and offer to have Dennis follow up.
- Never collect bank account details, signatures, or money. This is interest-capture only.
- If asked something you don't know, say so and offer a follow-up from Dennis.
- Keep turns short. Let the form do the data capture; you guide and reassure.
```

---

## 8. Per-project funder page + funding data

Each project funder page reuses the overview design, **scoped to the project**:

- Project header (name, location, unit count) + status badge.
- The project's **cost stack vs revenue** visual (the `StackColumn` from `FundersPage.jsx`), fed from the project's funding config.
- **This project's** funding package + senior/junior split (the capital-stack visual from §3, with real `$`).
- **Demand status** — current subscription multiple vs the 3× trigger, with the **"indicative until 3× cover"** caveat prominent.
- The **registration form** (§5), project prefilled.
- The **project-tuned voice consultant** (§7).

**Funding data location:** add a per-project **funding config** (a config file or a `project_funding` table — match how project data is already stored). Shape:

```ts
type ProjectFunding = {
  slug: string;
  package_amount: number;        // committed development facility
  grv: number;
  tdc: number;                   // total dev cost ex-finance
  margin_pct: number;            // GST-correct, on net realisation
  cost_stack: { label: string; value: number }[];
  demand_current_x: number;      // e.g. 1.5
  demand_trigger_x: number;      // 3
  status: 'pending' | 'open' | 'triggered';
};
```

Where a project has no confirmed model yet (Seafields, Wavecrest, Hemp Homes), set `status: 'pending'` and render the **"stack pending confirmation"** card instead of numbers — never invent figures.

---

## 9. Compliance & disclaimers — CHECKPOINT (legal sign-off required)

This is a build checkpoint, not legal advice; Dennis to confirm wording and any licensing with his lawyer. **The audience is registered Australian banks (APRA-authorised ADIs) only**, which simplifies this considerably: ADIs are professional/wholesale clients by definition, so the retail-client disclosure risk that would attach to a public or private-investor raise does not arise here. The buyer site's "no financial product is offered" banner exists for the **buyer** pages; the funder pages are a separate, bank-only context.

Build:

- **Registered-bank gate:** before showing funder detail or accepting a registration, require the **registered-bank confirmation** declaration (§5) — "[institution] is a registered Australian bank / APRA-authorised ADI and I am authorised to register on its behalf." This is the gate; no generic sophisticated-investor flow is needed.
- **Funder-specific disclaimer set** (separate from the buyer banner): "Directed to registered Australian banks (ADIs) only. Registration of interest only — not an offer or invitation, and not financial product advice. All figures are indicative and subject to confirmation once demand reaches 3× cover and to formal documentation and due diligence." Leave final wording as a clearly-marked placeholder for legal.
- **Do not** apply the buyer "real estate marketing only / no financial product" banner to funder routes; give funder routes their own layout/banner.
- **Access:** because this backs targeted outreach to named bank contacts rather than a public raise, consider whether the funder routes should be lightly access-gated (e.g. unlisted but reachable, or behind a simple confirmation interstitial) vs openly in the nav. Default: keep "For Funders" in the nav with the registered-bank gate on the form; Dennis to confirm if he wants the pages unlisted instead.
- Surface a TODO in the PR: confirm with Dennis's lawyer whether arranging the senior/junior syndication and the retail-FRoR arrangement is a regulated activity in this bank-to-bank context, and finalise disclaimer wording.

---

## 10. Done checklist

- [ ] Inspect-first note posted (voice provider, form→DB→email path, project-data location, styling, routes).
- [ ] `/funders` overview live; ported from `FundersPage.jsx`; capital-stack (senior/junior) section added; nav updated with "For Funders."
- [ ] `/{slug}/funders` pages live for active projects; Branscombe populated from real model numbers (§11); pending projects show the "pending confirmation" card.
- [ ] Registration form submits → `funder_registrations` row + Resend notification; one row per registration; rate-limited; success/error states match `/developers`.
- [ ] Senior/junior logic correct: senior = 50% + FRoR copy; junior = 10–50% validated.
- [ ] Voice consultant ("Sterling") working on each funder page with correct per-project context; generic on overview.
- [ ] Registered-bank gate + funder-specific disclaimers in place (wording flagged for legal).
- [ ] Mobile responsive; keyboard focus visible; reduced-motion respected.

---

## 11. Reference data — Branscombe funding pack (wire these)

From the V23/V24 finance model. Use as the Branscombe `ProjectFunding` config.

- **GRV:** $25,345,000 (37 × $685,000)
- **Total dev cost (ex-finance):** $17,735,006
- **Indicative margin:** 23.0% (GST-correct, on net realisation)
- **Funding package (committed facility):** **confirm with Dennis** — base senior ask is **$14,926,468**; back-to-back peak drawn is ~$8.0M. Recommend the **committed facility limit** as "the package" lenders fund (likely ~$14.93M), with the ~$8M peak shown as the de-risked drawn exposure. Dennis to set the exact package figure.
  - Senior 50% ≈ $7.46M (if package = $14.93M).
  - Junior 10% floor ≈ $1.49M.
- **Cost stack** (reconciles to $17,735,006):
  - Land $2,500,000
  - Site works $3,500,000
  - Modules $7,314,000
  - Shipping — sea $1,800,000
  - Shipping — land $196,500
  - Install & complexing $666,000
  - Builder & warranty $185,000
  - Finishing $919,968
  - Fees $653,538
- **Demand:** current ≈ 1.5× (55 registrations vs 37 lots); trigger 3× (111). `status: 'open'`.

Seafields / Wavecrest / Hemp Homes: `status: 'pending'` until their models exist.
