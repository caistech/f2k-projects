# Supabase migrations & cutover data dump

## First-time setup

Apply the consolidated schema once to the new Supabase project
(`earqebbwhklxadqawtex`):

```bash
# Option A — Supabase CLI (needs DB password)
supabase link --project-ref earqebbwhklxadqawtex
supabase db push

# Option B — paste 0001_purchaser_schema.sql into the SQL Editor
# https://supabase.com/dashboard/project/earqebbwhklxadqawtex/sql/new
```

## Cutover data dump (one-shot, when ready to go live)

Once the new public site is verified and you're ready to switch, dump live
purchaser data from the existing fund Supabase project and restore it to the
new project. The schema is identical for the relevant tables.

### 1. Get the connection strings

Fund Supabase project (source) — from the fund repo's Supabase dashboard
→ Settings → Database → Connection string → URI tab:
```
postgresql://postgres.<FUND_REF>:<FUND_DB_PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

New Supabase project (target):
```
postgresql://postgres.earqebbwhklxadqawtex:<NEW_DB_PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

### 2. Dump data only from the relevant tables

```bash
pg_dump \
  --data-only \
  --no-owner \
  --no-acl \
  --disable-triggers \
  --table=seafields_registrations \
  --table=branscombe_registrations \
  --table=hemp_homes_waitlist \
  --table=seafields_lot_allocations \
  --table=branscombe_unit_allocations \
  "$FUND_DB_URL" \
  > cutover-data.sql
```

Notes:
- `--disable-triggers` skips the updated_at trigger during INSERT so the
  original `updated_at` values are preserved.
- `audit_log` is NOT migrated — each site keeps its own action history. The
  fund-site audit log stays on the fund Supabase as historical record.

### 3. Truncate the seed data on the new project (only the allocation tables —
preserves the seed but lets the live dump take precedence)

```bash
psql "$NEW_DB_URL" <<EOF
TRUNCATE seafields_lot_allocations CASCADE;
TRUNCATE branscombe_unit_allocations CASCADE;
EOF
```

(`seafields_registrations`, `branscombe_registrations`, `hemp_homes_waitlist`
are empty on the new project; no truncate needed.)

### 4. Restore

```bash
psql "$NEW_DB_URL" < cutover-data.sql
```

### 5. Verify

```bash
psql "$NEW_DB_URL" -c "
  SELECT 'seafields_registrations' AS table, COUNT(*) FROM seafields_registrations
  UNION ALL
  SELECT 'branscombe_registrations', COUNT(*) FROM branscombe_registrations
  UNION ALL
  SELECT 'hemp_homes_waitlist', COUNT(*) FROM hemp_homes_waitlist
  UNION ALL
  SELECT 'seafields_lot_allocations', COUNT(*) FROM seafields_lot_allocations
  UNION ALL
  SELECT 'branscombe_unit_allocations', COUNT(*) FROM branscombe_unit_allocations;
"
```

Compare with the same query against the fund Supabase to confirm row counts
match.

### 6. Stop the old endpoints

After cutover, disable on the fund site (separate task — see
F2K-Fund-Tokenisation Task #7):
- `/api/seafields/register`
- `/api/branscombe/register`
- `/api/hemp-homes/waitlist`

So no further purchaser registrations land on the fund Supabase.

### Backfill window

If any registrations come in between dump and the fund-site endpoint
disablement, re-run the dump/restore for just those rows:

```bash
pg_dump --data-only --no-owner --no-acl \
  --table=seafields_registrations \
  --table=branscombe_registrations \
  --table=hemp_homes_waitlist \
  --where='created_at > '"'"'$CUTOVER_TIMESTAMP'"'"'' \
  "$FUND_DB_URL" \
  > backfill.sql
psql "$NEW_DB_URL" < backfill.sql
```

## Admin user setup

After the schema is applied:

1. Go to `https://supabase.com/dashboard/project/earqebbwhklxadqawtex/auth/users`
2. Click **Invite User** for each admin email:
   - `dennis@factory2key.com.au`
   - `uwe@factory2key.com.au`
   - `tanveer@factory2key.com.au`
   - `lennie@factory2key.com.au`
3. Each admin receives a magic-link email — they click it, set a password.
4. Once `auth.users` rows exist for all four, run in SQL Editor:

```sql
INSERT INTO admin_users (auth_user_id, email, role, full_name)
SELECT id, email, 'super_admin',
  CASE email
    WHEN 'dennis@factory2key.com.au' THEN 'Dennis McMahon'
    WHEN 'uwe@factory2key.com.au' THEN 'Uwe Jacobs'
    WHEN 'tanveer@factory2key.com.au' THEN 'Tanveer'
    WHEN 'lennie@factory2key.com.au' THEN 'Lennie'
  END
FROM auth.users
WHERE email IN (
  'dennis@factory2key.com.au',
  'uwe@factory2key.com.au',
  'tanveer@factory2key.com.au',
  'lennie@factory2key.com.au'
)
ON CONFLICT (email) DO NOTHING;
```

After that, all four can sign in at `f2k-projects.vercel.app/admin/login`.
