-- Extend admin_users with structured profile fields used by /admin/settings.
-- first_name + last_name replace the single full_name field; full_name becomes
-- a GENERATED column so any legacy reader keeps working.
-- Adds an updated_at column + trigger and self-service RLS so signed-in admins
-- can read and update their own row through the user-context client.
-- Idempotent: safe to re-apply.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS first_name             TEXT,
  ADD COLUMN IF NOT EXISTS last_name              TEXT,
  ADD COLUMN IF NOT EXISTS phone                  TEXT,
  ADD COLUMN IF NOT EXISTS company                TEXT,
  ADD COLUMN IF NOT EXISTS job_title              TEXT,
  ADD COLUMN IF NOT EXISTS email_marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill first_name / last_name from the legacy single-field full_name.
-- Only touches rows where first_name is still NULL so re-runs are no-ops.
UPDATE admin_users
   SET first_name = split_part(full_name, ' ', 1),
       last_name  = NULLIF(regexp_replace(full_name, '^\S+\s*', ''), '')
 WHERE full_name IS NOT NULL
   AND first_name IS NULL;

-- Swap full_name from a plain editable column to a GENERATED column.
-- Wrapped so re-runs after the swap do nothing.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'admin_users'
       AND column_name  = 'full_name'
       AND is_generated = 'NEVER'
  ) THEN
    ALTER TABLE admin_users DROP COLUMN full_name;
    ALTER TABLE admin_users
      ADD COLUMN full_name TEXT GENERATED ALWAYS AS (
        NULLIF(
          TRIM(BOTH FROM COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')),
          ''
        )
      ) STORED;
  END IF;
END $$;

-- touch_updated_at() is defined in migration 0002.
DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON admin_users;
CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Self-service RLS: a signed-in admin can read + update their own row.
-- The service_role_all_admin_users policy from 0001 still covers all other access.
DROP POLICY IF EXISTS "admins_select_self" ON admin_users;
CREATE POLICY "admins_select_self"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "admins_update_self" ON admin_users;
CREATE POLICY "admins_update_self"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

COMMENT ON COLUMN admin_users.first_name IS 'First name set via /admin/settings.';
COMMENT ON COLUMN admin_users.last_name IS 'Last name set via /admin/settings.';
COMMENT ON COLUMN admin_users.phone IS 'Phone number set via /admin/settings (free-form; product does not enforce E.164 yet).';
COMMENT ON COLUMN admin_users.company IS 'Company / organisation set via /admin/settings.';
COMMENT ON COLUMN admin_users.job_title IS 'Job title set via /admin/settings.';
COMMENT ON COLUMN admin_users.email_marketing_opt_in IS 'Per-admin opt-in for non-transactional product / marketing emails.';
COMMENT ON COLUMN admin_users.full_name IS 'GENERATED from first_name + last_name. Read-only; do not write.';
