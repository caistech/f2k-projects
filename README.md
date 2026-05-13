# Factory2Key Projects

Public registration of interest portal for Factory2Key residential developments.

**This site is real estate marketing only. No financial product, security, or
investment is offered here.** No deposit is taken on this site.

## Why this repo exists

This site was carved out of `F2K-Fund-Tokenisation` on 2026-05-13 to keep
purchaser-facing registration of interest pages completely separate from any
wholesale-investor (fund tokenisation) content. Co-mingling the two surfaces on
a single public domain created ASIC/AFSL exposure:

- s911A — promoting interests in an MIS without an AFSL.
- s708 — wholesale exemption breach risk when fund content is publicly indexable.
- s1041H / ACL s18 — "AFSL pending" wording across all pages including
  retail-facing pages was misleading.

This repo carries only:

- A homepage listing current Factory2Key developments.
- One page per development with site plan, registration form, photos.
- The API routes that receive registrations and email both registrant + admin.
- A privacy policy scoped to project communications only.

No fund routes. No whitepaper. No capital stack. No "AFSL pending" copy.
No links to the fund site.

## Stack

- Next.js 14 (App Router), TypeScript strict, Tailwind.
- Supabase (Postgres + RLS) — separate project from the fund site:
  `https://earqebbwhklxadqawtex.supabase.co`
- Resend — registration confirmation + admin notification emails.
- GHL CRM — optional contact forwarding (best-effort; site works without it).

## Project structure

```
src/
├── app/
│   ├── page.tsx                 (homepage — projects index)
│   ├── seafields-estate/
│   ├── branscombe-estate/
│   ├── privacy/
│   └── api/
│       ├── seafields/{register,lots,allocations}/route.ts
│       └── branscombe/{register,units,allocations}/route.ts
├── components/
│   ├── ProjectsHeader.tsx       (clean header, no fund links)
│   ├── ProjectsFooter.tsx       (clean footer, corporate contact only)
│   ├── seafields/               (HeroSitePlan, SiteMap, RegistrationForm, ...)
│   └── branscombe/              (HeroSitePlan, FloorPlanGallery, RegistrationForm, ...)
├── data/
│   ├── seafields/               (lots.ts + polygons.json + geojson.json)
│   └── branscombe/              (units.ts + polygons.json + voronoi.json + geojson.json)
└── lib/
    ├── supabase-service.ts
    ├── html-escape.ts
    └── ghl.ts

supabase/
└── migrations/0001_purchaser_schema.sql
```

## Setup

```bash
npm install
cp .env.example .env.local
# fill in Supabase, Resend, optional GHL keys
```

Apply the schema to the new Supabase project:

```bash
# Option A — Supabase CLI (requires DB password)
supabase link --project-ref earqebbwhklxadqawtex
supabase db push

# Option B — paste supabase/migrations/0001_purchaser_schema.sql into SQL Editor
```

Run locally:

```bash
npm run dev   # http://localhost:3001
```

## Required env vars (Vercel)

| Var | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings (server-only) |
| `RESEND_API_KEY` | resend.com (can share with fund site key) |
| `RESEND_FROM_EMAIL` | e.g. `Factory2Key Projects <onboarding@resend.dev>` |
| `GHL_API_KEY` | Optional; LeadConnector API |
| `GHL_LOCATION_ID` | Optional; LeadConnector sub-account ID |

## Hard rules

- No deposit collection on this site. Ever.
- No financial product language. No "fund", "tokenisation", "investor",
  "AFSL", "wholesale", "subscription", "security" in user-facing copy.
- "Investor — Owner Occupier" / "Investor — Rental" buyer types are real-estate
  terms and acceptable in form options.
- No outbound links to fund-tokenisation site or any AFSL-related page.
- Privacy policy scoped to project communications only.

## Related

- `F2K-Fund-Tokenisation` — fund/investor portal (separate domain, wholesale-gated).
- `www.factory2key.com.au` — corporate site (separate, marketing only).
