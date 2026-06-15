-- 0053_seafields_employer_registrations.sql
--
-- Local-employer accommodation capture for Seafields. Local businesses currently fly in FIFO
-- workers because there is no local accommodation; this table captures employers who want to
-- secure staff housing via a TAKE-OR-PAY rental commitment (guaranteed beds without owning).
--
-- It is a DIFFERENT audience + schema from the buyer registration tables (seafields_registrations)
-- and the funder table (funder_registrations) — do NOT overload those. The "own it" path (an
-- employer who would rather buy a house-and-land package for staff) is NOT captured here: that
-- redirects to the main Seafields registration flow (/seafields-estate?ref=employer) and writes no
-- row to this table.
--
-- Take-or-pay is ADMIN-HANDLED: there is deliberately NO agent attribution column on this table.
--
-- Estate-scoped from day one (estate_slug) so the pattern can lift to another estate later
-- without a migration, but only Seafields is wired up now.
--
-- One row per registration. Writes are performed exclusively by the service-role client
-- (see src/app/api/seafields/employer-register/route.ts), which bypasses RLS. RLS is enabled with
-- no public policies so the table is deny-by-default for anon/auth keys — consistent with the
-- anon RLS lockdown (migration 0027) and the funder pattern (0052).

CREATE TABLE IF NOT EXISTS public.seafields_employer_registrations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estate_slug              TEXT NOT NULL DEFAULT 'seafields',
  business_name            TEXT NOT NULL,
  abn                      TEXT,
  contact_name             TEXT NOT NULL,
  contact_email            TEXT NOT NULL,
  contact_phone            TEXT,
  staff_count              INTEGER,                    -- staff needing accommodation
  unit_preference          TEXT CHECK (unit_preference IN ('whole_house', 'by_room')),
  quantity                 INTEGER,                    -- houses or rooms, per unit_preference
  commitment_term_months   INTEGER,                    -- the "take" (e.g. 6 / 12 / 24)
  required_start_date      DATE,
  fifo_roles_replaced      TEXT,                       -- optional narrative value for funders
  would_consider_buying    BOOLEAN NOT NULL DEFAULT FALSE,
  consent                  BOOLEAN NOT NULL DEFAULT FALSE,
  -- Morgan (employer) discovery transcript captured client-side + submitted with the form
  -- (matches the funder_registrations pattern). voice_conversation_id reserved for future
  -- server-side capture.
  voice_transcript         JSONB NOT NULL DEFAULT '[]'::jsonb,
  voice_conversation_id    TEXT,
  source_page              TEXT,                       -- route the registration came from
  status                   TEXT NOT NULL DEFAULT 'new', -- new | contacted | qualified | passed
  inserted_via             TEXT DEFAULT 'web_form'
);

CREATE INDEX IF NOT EXISTS seafields_employer_registrations_estate_created_idx
  ON public.seafields_employer_registrations (estate_slug, created_at DESC);

-- Deny-by-default: RLS on, no public policy. The register route + admin reads use the
-- service-role key (bypasses RLS). Belt-and-braces against any future client-side access.
ALTER TABLE public.seafields_employer_registrations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.seafields_employer_registrations IS
  'Take-or-pay rental interest from local employers for Seafields staff accommodation. One row per registration. Admin-handled (no agent attribution). Service-role writes only (RLS deny-by-default). Estate-scoped via estate_slug.';
