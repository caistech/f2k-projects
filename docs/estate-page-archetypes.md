# Estate-page archetypes + classifier (draft v0.1)

> **Purpose.** A developer-onboarding submission (`developer_onboarding`) needs to become an
> estate page. The page shape is **not** one-size-fits-all — it's driven by *what's being sold*
> and *how much product data exists yet*. This doc names the archetypes, gives each a dataset
> schema, and a classifier that routes a submission to one of them.
>
> **Why now / why manual.** We build the first few by hand to discover the archetype boundaries
> and the required-vs-optional field map. That map is exactly the spec the eventual
> **SayFix → parsed-dataset → auto-PR** loop will encode: *classify → map dataset → generate page → PR*.
> The "fork the dataset to conform to one pattern" instinct is right — **classification is step 1.**
>
> **Status:** draft. Each archetype is grounded in a live estate. Mixed-use (Wavecrest) is the
> lightest and the placeholder we'll harden as we do Dutton Terrace by hand.

---

## The two axes (this is the whole idea)

An archetype = **product type** × **maturity (data availability)**.

| | **Early / concept** (image + stats + "TBC", register-interest) | **Mature** (schedule + pricing + interactive) |
|---|---|---|
| **Lots (raw land subdivided)** | → graduates into → | **A. Subdivision** (Seafields) |
| **Homes (fixed built-form)** | → graduates into → | **B. Defined-Homes** (Branscombe) |
| **Mixed land-uses (resi + childcare + aged-care + commercial…)** | **C. Master-Planned / Mixed-Use** (Wavecrest) | (graduates toward A with a land-use overlay) |

Key consequence: **the same estate changes archetype as it matures**, and a big master-plan does
this **stage-by-stage**. An estate enters as an early **mixed-use/master-plan** (Archetype C) and
individual stages *graduate* into lot-precise **Subdivision** (Archetype A) as each stage gets a
structure plan → approval → pricing. So **C composes A**: the master-plan overview stays C while a
released, priced, approved stage renders as an A sub-view. The classifier keys on **maturity first**
(what product data exists), **product-type second** (which mature form it grows into).

**Maturity ladder** (read off `zoning_status` + supplied artifacts): `concept` (raw, unzoned —
Dutton) → `structure_plan` (a Structure Plan exists — Wavecrest overall) → `stage_approved`
(a stage has planning/construction approval + defined lots — Wavecrest Stage 2/3) → `selling`
(lots scheduled + priced — Seafields). A master-plan can sit at several rungs at once across stages.

---

## Lifecycle: minimal → full (progressive enhancement)

The page is **one page that grows**, not a series of rebuilds. Two moves:

1. **Classify the destination early** from the submission (offer + land use):
   lots/land (± H&L) → **A** · fixed homes only → **B** · any non-residential land use → **C**
   (with stages that later graduate to A).
2. **Render what the data supports, framed toward that destination.** Early the product layer is
   usually empty, so the live page is a **C-shaped shell** (hero · stats · vision/land-use · register)
   *even when the destination is A or B* — A's lot map and B's unit picker have nothing to show until
   their data exists. As each dataset arrives its section lights up and the page **graduates**:

   | Data that arrives | Section it lights up | Moves toward |
   |---|---|---|
   | suburb · concept/structure-plan image · land-use mix | hero image, land-use grid | richer **C** |
   | zoning + subdivision/DA plan + lot schedule | interactive lot map + table (via polygon extractor) | **A** |
   | pricing (band or per-lot) | prices on map/table + purchase terms | **A** (selling) |
   | modular H&L designs | designs gallery + H&L pricing | **A** with H&L offer |
   | fixed home types + per-unit price + renders | unit picker + elevation gallery | **B** |

So: **minimal = the C shell framed to its destination; full = the destination archetype, reached by
progressively filling the product layer.** Same slug, same page, a widening dataset — exactly what the
auto-builder re-runs on each new piece of developer data (a PR diff per upgrade).

> "**Land-only vs house-and-land vs H&L-only**" is an **offer config within A** (a flag on the
> lots/designs), **not** a separate archetype — same page shape, different price/offer columns.

## Shared base layer (every archetype inherits this)

The chrome is identical across archetypes — only the **product layer** differs.

```
EstateBase {
  slug              string          // url segment, e.g. "dutton-terrace"
  name              string          // "Dutton Terrace"
  developer         { name, email, mobile?, website?, submitter_role? }
  location          { suburb, state, postcode, lat?, lng? }   // suburb REQUIRED (not just "SA")
  headline          string          // one-line vision, e.g. "40 homes + childcare + aged care on 6.3 ha"
  hero_media        string|null     // hero image / site-plan image / render
  maturity          "concept" | "zoned" | "da_approved" | "selling"
  stats[]           { value, label }                          // the key-numbers grid
  register          { enabled: true, fields, ref_tag? }       // the RegistrationForm (shared)
  voice?            { agentId, prompt }                        // optional chrome voice guide
  funders?          ref to the /funders layer (optional, bank-facing)
}
```
Required to publish *anything*: `slug, name, location.suburb+state, headline, register`.

---

## A. Subdivision (lot-precise) — **Seafields**

**Sells:** serviced **lots** (vacant land) ± modular **house-and-land** packages. Buyer picks lot(s)
on an **interactive map**. Heaviest archetype; needs a real plan + pricing.

**Grounded in:** `seafields_lot_allocations` (live), polygon site-map, `stages`, `SEAFIELDS_DESIGNS`.

```
SubdivisionData extends EstateBase {
  lots[] {                       // from seafields_lot_allocations
    lot_number, sqm, stage|stage_id, status,
    x_pct, y_pct | polygon,      // map placement (PNG %-coords OR DA-derived polygons)
    retail_price | land_rate_override_per_sqm,
    dwelling_type|dwelling_type_id, category, zone,
    land_only, public_label, display_price_to_public,
    subdivisible, ancillary_dwelling_eligible
  }
  stages[]                       { id, name, status, release_order }
  pricing                        { basis: "size_band"|"per_lot", bands?: [{min,max,price}] }
  designs[]?                     // modular H&L overlay (Joey/Koala/EMU…): name, beds, baths, size, price, hero, plan
  subdivision_plan               // source DWG/DA → polygons OR an image
}
```
**Page sections:** hero · interactive lot map (pick lots) · lot table · stages · designs/H&L gallery ·
purchase terms · register (with lot selection).
**Won't render without:** the lot schedule **and** a site plan (geometry or image) **and** pricing.

**Data pipeline (plan → lots) — shared with C-stages that graduate to A:** a CLE/DA subdivision plan
(PDF/DWG) → the **Seafields polygon-extractor toolchain** → lot polygons + a lot schedule (sizes from
the plan's LOT SUMMARY). Worked input: Wavecrest *"Attachment A — Modified Subdivision Plan"* (CLE Town
Planning + Design, **Lot 155 Waggrakine**, **WAPC 157409**, 27-Apr-2023) — **61 residential lots @
799–899 m²** (min 802 / max 899 / avg 858), 5.2339 ha, + public open space (6.44 + 2.51 ha), bounded by
Sutcliffe/Tramway/David Rds. Same shape Seafields uses (same planner, same locality), so **Wavecrest
Stage 2 graduates C→A on the existing Seafields rails** — extract the 61 polygons → interactive lot map.

## B. Defined-Homes (built-form) — **Branscombe**

**Sells:** specific architect-defined **homes/units**. Buyer picks a **unit/design**. No
subdivide-your-own-lot; the homes are the product.

**Grounded in:** `src/data/branscombe/units.ts` (`UnitData`), `ElevationGallery`, per-unit `retail_price`.

```
DefinedHomesData extends EstateBase {
  units[] {                      // UnitData
    id, unitNumber, type (house_type), zone, parking{spaces,location}, retail_price
  }
  house_types[]                  { type, beds, baths, internal_m2, deck_m2 }
  elevation_schemes[]            { id, label, tag?, finishes:[{part,name,colour,hex}] }
  design_media[]                 { plan, hero, renders[] }
  pricing                        { basis: "per_unit" }
}
```
**Page sections:** hero · plan-view unit picker (price popup per unit) · house-type cards ·
elevation/colour gallery · register (with unit selection).
**Won't render without:** the unit schedule **and** per-unit pricing **and** plans/renders.

## C. Master-Planned / Mixed-Use — **Wavecrest**  *(the master-plan + non-residential archetype)*

**Sells:** a large master-planned community with a **mix of land uses** AND a **range of residential
lot products** — not a single subdivision. **Renders from a Structure Plan + stats + stage badges +
register-interest**, tolerating "TBC" pricing; released/approved stages graduate to an **A** sub-view.
This is the archetype an estate **enters at** and the home for anything mixed-use.

**Grounded in:** `wavecrest-estate/page.tsx` (F2K's lighter render — image site-plan, TBC pricing,
stats grid, stage badges, `RegistrationForm`; **no lot tables in the live DB**) + the real **HLD
Wavecrest** master-plan it mirrors. Wavecrest (Humfrey Land Developments) = ~1,860 lots with a
**Structure Plan**, **Stage 2** (61 lots, ocean/city views, Sutcliffe & Tramway Rds, underground
services) and **Stage 3** (2,000 m² lots, Hackett Rd) at construction approval — plus a **Town
Centre, School, Northern Recreational Area, Tourist Resort and Caravan Park**, and residential lot
products from **1 ha down to R80 townhouse** (300 m² around parks, 760–820 m², 2,000 m²). It shows C
at its rich end: multiple land uses × multiple lot products × per-stage maturity.

```
MasterPlanData extends EstateBase {
  structure_plan_image           string|null      // structure/master-plan image — not interactive polygons
  land_use_mix[] {                                // the mixed-use core — non-residential parcels
    use: "residential" | "town_centre"|"commercial"|"retail"
       | "school"|"education" | "aged_care" | "childcare"
       | "recreation"|"open_space"|"parks" | "tourism"|"resort"|"caravan_park" | "community",
    label, lots?|area_ha?|units?, status: "planned"|"approved"|"released"
  }
  lot_products[]?                                  // the residential VARIETY (a master-plan sells several)
    { label, sqm_or_range, zone?:"R80"|"R20"|…, status }   // e.g. "1 ha lifestyle", "R80 townhouse", "300 m² park-fronting"
  stages[]                       { name, maturity:"structure_plan"|"approved"|"selling",
                                   lot_count?, notes? }     // badges; a "selling" stage can graduate to Archetype A
  amenities[]?                   { label }                  // parks/gardens, views, services-underground
  pricing                        "TBC" | { per_product?: [...] }
}
```
**Page sections:** hero (structure-plan image) · key-stats grid · **land-use mix** · **lot-product
range** · stages (badges, per-stage maturity) · amenities/vision · register interest.
**Won't render without:** just the base layer + a headline + (ideally) one structure/site-plan image.
It is the **lowest bar to a credible page** — and the only archetype that models non-residential land
uses — which is why early/unzoned and mixed-use estates both live here.

> **Brand note:** Wavecrest + Seafields are **HLD (Humfrey Land Developments)** estates (sales:
> barryh@hld.com.au) that F2K builds pages for — so the "whose brand travels" gate applies: an HLD
> estate page carries HLD's identity, not a CAS/F2K-branded one. Capture the land-owner/developer
> brand in `EstateBase.developer` and theme accordingly.

---

## Classifier (submission → archetype)

Run top-to-bottom; first match wins.

1. **Maturity gate first.** If there is **no lot/unit schedule AND no pricing AND no plan with
   geometry** → the estate is *early* → **Archetype C (Master-Plan/Mixed-Use)**, regardless of product
   type. (You cannot render A or B without their product layer.)
2. **Product-type, once mature:**
   - Submission describes **fixed/defined homes** (a set of named home types/units, "architecturally
     unique", per-home pricing, no buyer subdivision) → **B. Defined-Homes**.
   - Submission describes **lots / subdivision** (lot count, lot sizes, "vacant land or H&L", a
     subdivision/DA plan, stages) → **A. Subdivision**.
3. **Mixed-use signal** (presence of non-residential land uses — childcare, aged-care, commercial,
   retail, community) → **C** even if otherwise mature, *until* the resi component is itself zoned +
   priced enough to render as A with a land-use overlay.

Signals to read off `developer_onboarding`: `dwellings_envisaged`, `site_area_value`, `zoning_status`
("raw/not yet zoned" ⇒ early ⇒ C), `vision` (parse for "childcare/day care/aged care/commercial/
retail/community" ⇒ mixed-use), presence of a subdivision plan / lot schedule / pricing / designs
(usually **absent** at submission ⇒ start at C).

---

## Worked example — Zen Hartree / **Dutton Terrace** → Archetype **C (Master-Planned / Mixed-Use)**

**Why C:** `zoning_status` = *"Raw land — not yet zoned"* (early ⇒ maturity gate), **and** the vision
names **childcare + aged-care** (mixed-use signal). No lot schedule, no pricing, no plan.

| Base/field | Dutton value | Status |
|---|---|---|
| name | Dutton Terrace | ✓ |
| location.suburb | — (only "SA" 5605 given) | **needed** (postcode 5605 ≈ Port Pirie region SA) |
| headline | "~40 homes + childcare + aged-care on 6.3 ha" | ✓ |
| stats[] | 40 lots · 6.306 ha · mixed-use | ✓ |
| land_use_mix[] | residential ~40 lots · childcare (area) · aged-care (area) | ✓ (from vision) |
| maturity | concept (unzoned, site control negotiating) | ✓ |
| site_plan_image | — | none yet (optional for C) |
| pricing | TBC | ✓ (C tolerates) |
| register | shared form | ✓ |

**Verdict:** Dutton can ship a **credible Archetype-C "register interest" page today** (hero + stats +
land-use mix + vision + form). To *graduate* it toward A (lot-precise) later we'd need, from Zen:
**(1)** the actual suburb, **(2)** a concept/master-plan **image**, **(3)** the land-use breakdown
confirmed, then later **(4)** zoning + subdivision plan, **(5)** a lot schedule, **(6)** pricing basis,
**(7)** any intended modular designs.

---

## Deterministic capture → credible funder output (form evolution + the cost/revenue gap)

The funder summary's credibility is **inversely proportional to how much the LLM has to assume**. So
the onboarding form should **convert narrative asks into structured fields** wherever the answer is a
finite choice — the developer states the fact, the LLM stops guessing it, and the cost/revenue stack
stops resting on assumptions.

**Deterministic — capture as dropdowns/structured (the developer self-classifies):**
- **Archetype** — *subdivision · set house-and-land · mixed-use master-plan* (removes the classifier's
  single hardest guess — the developer just tells us).
- **Target market** — first-home buyers · investors · downsizers · essential/government workers ·
  retirees · owner-occupiers (multi-select).
- **Yield** — lot count, lot-size mix, non-residential parcels (childcare/aged-care/commercial/school/POS).
- **Land uses** — checkboxes (drives the Archetype-C land-use mix directly).
- **Maturity** — zoning status, approvals held, services status (drives the concept→A graduation).
- **Deal / land** — acquisition basis (own / option / JV + %), indicative land cost.
- **Pricing intent** — expected price points / target $ per lot or per H&L (even rough — seeds revenue).

**Non-deterministic — leave narrative (this is where the LLM legitimately adds value):**
the **vision**, **why it's attractive to that target market**, the lifestyle/positioning story.

### The funder gap — what we need to price + build a credible cost stack (≥20% margin)

Funder test (the `/funders` engine): **revenue stack (Σ price × saleable units) − cost stack (TDC)
= margin, must clear ~20%+.** Where each input comes from, and what Dutton has today:

| Input | Source | Have for Dutton? |
|---|---|---|
| Saleable **yield** (lots + sizes + non-resi parcels) | concept/structure plan | ~40 rough only — need a plan |
| **Land cost** / deal terms | developer (deterministic field) | no |
| **Civil / subdivision cost** ($/lot: earthworks, roads, services, POS, headworks) | **benchmark Seafields/Wavecrest** | estimable |
| Approvals · holding · finance · contingency | % of the above | estimable once land+civil set |
| **Home build cost** (the H&L revenue line) | existing F2K modular cost models (Seafields/EMU) | **yes** |
| **Revenue / price points** | waitlist **`budget_band`** ceiling + market comps (median/growth/vacancy) | collecting now via the register form |

So an Archetype-C **funder page is estimates-only**: cost stack **benchmarked** from our built estates
+ a **developer-supplied land cost**; revenue stack **validated by the waitlist** (the `budget_band`
field) and market comps. The waitlist is the live half — *"would they buy AT the price"* — which is
exactly why the register form captures budget up front. As the deterministic fields fill in (yield,
land cost, price points), the estimate tightens and the ≥20% test becomes real.

## Notes for the future auto-builder (SayFix → PR)

1. **Parse** `developer_onboarding` → a normalized `EstateBase` + run the **classifier** → archetype.
2. **Map** the parsed dataset onto the chosen archetype schema; fields it can't fill stay null and
   surface as a **"needs from developer"** checklist (don't fabricate lots/prices).
3. **Generate** the page from the archetype template + the dataset → open a **PR for review** (never
   auto-merge — the manual review is the point until the archetype maps are proven).
4. **Re-classify on update**: as a developer supplies zoning/plan/pricing, the estate **graduates**
   C → A (or stays C with richer land-use data). The PR diff shows the upgrade.

*Update this doc as each manual build teaches us a field. Dutton Terrace is the first Archetype-C
worked build.*
