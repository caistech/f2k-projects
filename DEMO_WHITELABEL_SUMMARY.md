# Demo & White-Label Product Summary

## What Was Built

### Demo Environment
- **Demo Supabase**: `cjlcywifsrwcecajammi` - separate from production
- **Demo Vercel**: `f2k-projects-demo.vercel.app`
- **Demo data**: Fictional estate with lots, registrations, users
- **Demo accounts**:
  - Admin: `demo-admin@example.com`
  - Agent: `demo-agent@example.com`
- **Demo banner**: Shows on all pages when `DEMO_MODE=true`
- **Email guard**: All emails rerouted in demo mode

### White-Label Product Page
- **Pricing page**: `/pricing` - explains $399/mo subscription
- **Homepage banner**: Shows in demo mode with CTA to pricing
- **Features listed**:
  - Custom branding
  - Interactive lot map
  - Registration forms
  - Blog & media gallery
  - Agent portal
  - AI post generation
  - Full data config (lots, stages, dwelling types, polygons)

### Technical Components Created
1. `scripts/seed-demo.mjs` - Seeds demo DB with fictional data
2. `src/components/DemoBanner.tsx` - Persistent demo warning banner
3. `src/app/(public)/pricing/page.tsx` - Product pricing page
4. `DEMO_SETUP.md` - Setup instructions for demo environment
5. `src/lib/email/recipient-guard.ts` - Added `isDemoMode()` check

### Key Env Vars Added to Demo Vercel
```
NEXT_PUBLIC_SUPABASE_URL=https://cjlcywifsrwcecajammi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
NODE_AUTH_TOKEN=... (GitHub PAT for packages)
```

## Product Model

**Target**: Developers/agents who want to offer estate sales platform to their clients

**Flow**:
1. Demo (free) → prospects explore full platform
2. Purchase ($399/mo) → get white-labeled instance
3. Self-serve config → upload branding, lots, polygons, pricing

## What's NOT Built Yet (Phase 2)
- Stripe subscription checkout
- Auto-provisioning of new Vercel+Supabase on purchase
- Self-serve config wizard UI
- Custom domain setup automation

## Lessons Learned
- Vercel + GitHub Packages auth requires `NODE_AUTH_TOKEN` env var
- pnpm on Vercel doesn't read `.npmrc` variable interpolation - switched to npm
- Separate Vercel projects need separate GitHub token env vars
- Siloed architecture (separate Supabase per client) is correct for this product
