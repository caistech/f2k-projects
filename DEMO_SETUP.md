# Demo Environment Setup

This document describes how to set up a self-serve demo environment for prospective developer clients to explore the F2K Projects platform.

## Architecture Overview

- **Separate silo**: Demo runs as its own Vercel project + Supabase project
- **Same codebase**: Uses the same code as production (no branch needed)
- **Demo mode**: `DEMO_MODE=true` gates outbound side effects
- **Fictional data**: Seeded with fake estate, lots, registrations, and users
- **Nightly reset**: Cron job re-runs the seed script

## Step 1: Create Demo Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note the project URL and service role key
3. Run migrations:
   ```bash
   # Set demo project as target
   npx supabase link --project-ref <demo-project-ref>
   
   # Push all migrations
   npx supabase db push
   ```

## Step 2: Configure Environment Variables

In the demo Supabase project settings, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://<demo-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
RESEND_API_KEY=<resend-key>  # Optional - emails will be rerouted anyway
```

## Step 3: Seed the Demo Database

```bash
# Run the seed script against the demo project
DEMO_SUPABASE_URL=https://<demo-project>.supabase.co \
DEMO_SUPABASE_SERVICE_KEY=<service-role-key> \
node scripts/seed-demo.mjs
```

This creates:
- Stages (7 stages, Stage 1 open)
- Dwelling types (7 types)
- ~33 lots with fictional pricing
- 5 fake registrations with lot interests
- Demo admin account: `demo-admin@example.com`
- Demo agent account: `demo-agent@example.com`

## Step 4: Deploy to Vercel

1. Create a new Vercel project (or deploy from fork)
2. Add the same environment variables as above
3. Deploy

## Step 5: Set Up Nightly Reset

Add a Vercel Cron job to re-run the seed nightly:

1. In Vercel dashboard, go to your project → Settings → Cron Jobs
2. Add a new cron:
   - Schedule: `0 4 * * *` (4 AM UTC = noon Perth time)
   - Endpoint: Create a new API route `/api/cron/seed-demo`
   - Or call the seed script externally via GitHub Actions

## Demo Accounts

After seeding, the demo accounts are:

| Role | Email | Password |
|------|-------|----------|
| Admin | demo-admin@example.com | (printed by seed script) |
| Agent | demo-agent@example.com | (printed by seed script) |

Share these credentials with prospective clients for self-serve exploration.

## How Demo Mode Works

### Email Guard
When `DEMO_MODE=true`, all outbound emails are rerouted to the configured test email (default: dennis@corporateaisolutions.com). This prevents demo users from emailing real recipients.

See `src/lib/email/recipient-guard.ts`:
- `isDemoMode()` checks `process.env.DEMO_MODE === "true"`
- All email sends go through `guardRecipients()` which reroutes in demo mode

### Demo Banner
A persistent banner at the top of every page informs users they're in a demo environment:
- Shows "Demo Environment" with explanation
- Can be dismissed per-session
- Data resets nightly notice

### What's Blocked in Demo Mode
- Outbound emails → rerouted to test sink
- Google Drive/Gmail OAuth → UI shows "disabled in demo"
- GHL integrations → disabled
- AI generation → capped/stubbed

## Resetting the Demo

### Manual Reset
Run the seed script again:
```bash
node scripts/seed-demo.mjs
```

### Nightly Reset
The cron job re-runs the seed, clearing registrations and resetting lots to initial state.

## Troubleshooting

**Seed script fails with missing tables**: Ensure migrations have been pushed to the demo Supabase project first.

**Emails still going out**: Check that `DEMO_MODE=true` is set in Vercel environment variables.

**Demo banner not showing**: Ensure `NEXT_PUBLIC_DEMO_MODE=true` is set (the public prefix makes it available to client-side code).
