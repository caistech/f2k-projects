-- 0066_estate_buyer_pipeline.sql
--
-- The staged buyer-journey pipeline (spec: docs/estate-buyer-pipeline-design.md).
-- Replaces the 2-value waitlist_registrations.status with:
--   * a BACKBONE `pipeline_stage` (enquiry -> ... -> settled) — the contract path,
--   * an orthogonal `pipeline_state` (active | on_hold | withdrawn) + exit reason,
--   * independent MILESTONES (viewed / finance / holding-deposit) that tick in any order,
--   * an append-only `pipeline_events` log = the per-buyer timeline + drop-off analytics source,
-- plus an admin-managed `advisors` directory (mortgage brokers + financial advisors; no portal).
--
-- Estate-generic spine: every estate inherits it (Branscombe is tenant #1). Adding a stage =
-- a TS enum change, NOT a migration (enum fields are plain TEXT, validated in the app layer).
--
-- Service-role writes only (RLS deny-by-default, post-0027 secure pattern; no anon policies).
-- IDEMPOTENT: ADD COLUMN/TABLE IF NOT EXISTS + a guarded, event-logged backfill.

-- ============================================================================
-- advisors  (admin-managed directory; mirrors agents MINUS auth/invite/portal — D3 refined)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.advisors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  firm        TEXT,
  type        TEXT NOT NULL DEFAULT 'mortgage_broker',  -- mortgage_broker | financial_advisor
  email       TEXT,
  phone       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.advisors ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.advisors IS
  'Admin-managed broker/advisor directory for the finance gate (no login/portal). type = mortgage_broker | financial_advisor. Referenced by waitlist_registrations.nominated_advisor_id. Service-role writes only.';

-- ============================================================================
-- waitlist_registrations  (the journey origin — spine columns added here)
-- ============================================================================
ALTER TABLE public.waitlist_registrations
  -- Backbone (ordered): enquiry | agent_contacted | form_sent | registered | offer |
  --                     contract_conditional | unconditional | settled
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'enquiry',
  -- Orthogonal lifecycle: active | on_hold | withdrawn
  ADD COLUMN IF NOT EXISTS pipeline_state TEXT NOT NULL DEFAULT 'active',
  -- Captured on withdrawal: which backbone stage they died at + why.
  ADD COLUMN IF NOT EXISTS exit_stage  TEXT,
  ADD COLUMN IF NOT EXISTS exit_reason TEXT,   -- price_too_high|finance_declined|timing|home_unavailable|location_unsuitable|chose_competitor|went_cold|changed_plans|other
  ADD COLUMN IF NOT EXISTS exit_note   TEXT,
  -- Milestone: viewed (in_person | guided_remote — a remote walkthrough counts).
  ADD COLUMN IF NOT EXISTS viewed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS viewed_mode TEXT,
  -- Milestone: finance (managed gate). unknown | cash | preapproved | needs_finance | in_assessment | qualified | declined
  ADD COLUMN IF NOT EXISTS finance_status TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS nominated_advisor_id UUID REFERENCES public.advisors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS finance_referred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finance_conditional_amount NUMERIC,
  -- Milestone: holding deposit (per-estate gated, OFF by default — see estates.holding_deposit_enabled).
  ADD COLUMN IF NOT EXISTS holding_deposit_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS holding_deposit_amount NUMERIC;

CREATE INDEX IF NOT EXISTS waitlist_pipeline_idx ON public.waitlist_registrations (estate_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS waitlist_state_idx    ON public.waitlist_registrations (estate_id, pipeline_state);

COMMENT ON COLUMN public.waitlist_registrations.pipeline_stage IS
  'Backbone contract-path stage = furthest gate reached. Enum validated in app (src/lib/roi/pipeline.ts). Supersedes the legacy status field.';
COMMENT ON COLUMN public.waitlist_registrations.finance_status IS
  'Finance milestone (managed gate). The real "qualified buyer" signal; updated after the nominated advisor reports back.';

-- ============================================================================
-- pipeline_events  (append-only history = per-buyer timeline + drop-off analytics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pipeline_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id   UUID REFERENCES public.estates(id) ON DELETE CASCADE,
  waitlist_id UUID NOT NULL REFERENCES public.waitlist_registrations(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,            -- stage_change | state_change | milestone | finance | note
  from_value  TEXT,
  to_value    TEXT,
  reason_code TEXT,
  note        TEXT,
  actor_type  TEXT,                     -- agent | admin | system | buyer
  actor_id    UUID,
  actor_email TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pipeline_events_waitlist_idx ON public.pipeline_events (waitlist_id, created_at);
CREATE INDEX IF NOT EXISTS pipeline_events_estate_idx   ON public.pipeline_events (estate_id, created_at DESC);
ALTER TABLE public.pipeline_events ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.pipeline_events IS
  'Append-only buyer-journey history (stage/state/milestone/finance/note). Never overwritten — the per-buyer timeline and the raw material for funnel + drop-off reports. Service-role writes only.';

-- ============================================================================
-- estates  (per-estate pipeline config — holding deposit OFF until legal wording exists)
-- ============================================================================
ALTER TABLE public.estates
  ADD COLUMN IF NOT EXISTS holding_deposit_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS holding_deposit_terms_version TEXT;
COMMENT ON COLUMN public.estates.holding_deposit_enabled IS
  'Gates the holding-deposit milestone for this estate. OFF until that estate''s state-specific refundable-reservation wording is legally signed off (spec section 6).';

-- ============================================================================
-- Backfill — map the legacy status onto the backbone, log each as a system event.
-- Guarded by "no pipeline_events yet" so it is idempotent and never clobbers a live edit.
--
-- Mapping rule (decided 2026-07-01): 'registered' requires the NEW signed EOI (an artefact-2
-- `registrations` row carrying `signature_name`). Migrated LEGACY registrants (old Branscombe
-- form, `"migrated": true`, no signature) and the mis-seeded "qualified" rows BOTH fall through
-- to 'enquiry' — they have not done the new form, so an agent re-sends it. A qualify link sent
-- but not completed -> form_sent; legacy status 'contacted' -> agent_contacted; 'withdrawn'
-- carries to pipeline_state='withdrawn'.
-- ============================================================================

-- 1) Backbone stage from legacy state (no events created here, so step 3's guard still passes).
UPDATE public.waitlist_registrations w
SET pipeline_stage = CASE
      WHEN EXISTS (SELECT 1 FROM public.registrations r
                    WHERE r.waitlist_id = w.id AND (r.payload ? 'signature_name')) THEN 'registered'
      WHEN w.qualification_sent_at IS NOT NULL THEN 'form_sent'
      WHEN w.status = 'contacted' THEN 'agent_contacted'
      ELSE 'enquiry'
    END,
    pipeline_state = CASE WHEN w.status = 'withdrawn' THEN 'withdrawn' ELSE w.pipeline_state END
WHERE NOT EXISTS (SELECT 1 FROM public.pipeline_events e WHERE e.waitlist_id = w.id);

-- 2) Carry the legacy finance signal into the finance milestone (independent of stage), so
-- dropping a migrated registrant to 'enquiry' does not lose that they were e.g. pre-approved.
UPDATE public.waitlist_registrations w
SET finance_status = CASE
      WHEN lower(r.payload->>'finance_status') LIKE '%pre-approved%' THEN 'preapproved'
      WHEN lower(r.payload->>'finance_status') LIKE '%cash%'         THEN 'cash'
      WHEN lower(r.payload->>'finance_status') LIKE '%prefer not%'   THEN 'unknown'
      WHEN lower(r.payload->>'finance_status') LIKE '%not yet%'
        OR lower(r.payload->>'finance_status') LIKE '%not started%'
        OR lower(r.payload->>'finance_status') LIKE '%exploring%'
        OR lower(r.payload->>'finance_status') LIKE '%required%'     THEN 'needs_finance'
      WHEN lower(r.payload->>'finance_status') LIKE '%approved%'      THEN 'qualified'
      ELSE 'unknown'
    END
FROM public.registrations r
WHERE r.waitlist_id = w.id
  AND w.finance_status = 'unknown'
  AND (r.payload ? 'finance_status')
  AND nullif(trim(r.payload->>'finance_status'), '') IS NOT NULL;

-- 3) Log a system stage_change event per backfilled row (auditable + reversible).
INSERT INTO public.pipeline_events (estate_id, waitlist_id, event_type, from_value, to_value, actor_type, note)
SELECT w.estate_id, w.id, 'stage_change', w.status, w.pipeline_stage, 'system',
       'Backfilled from legacy status during pipeline migration 0066'
FROM public.waitlist_registrations w
WHERE NOT EXISTS (SELECT 1 FROM public.pipeline_events e WHERE e.waitlist_id = w.id);
