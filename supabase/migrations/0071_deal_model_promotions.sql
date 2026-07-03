-- 0071_deal_model_promotions.sql  (DRAFT — verify ref before applying)
--
-- Cross-repo promotion receiver for the F2K Deal Model.
--
-- DealFindrs computes the F2K partnership verdict (GO/ADJUST/REJECT) from an ingested
-- indicative feasibility study and, on a non-STOP verdict, PROMOTES the deal here by POSTing
-- the immutable economics snapshot to /api/deal-model/promotion (HMAC-signed, service-role
-- write). This table is the receiving end of that cross-DB hop — the three repos run on
-- SEPARATE Supabase instances, so promotion is a copy carrying the stable deal_id + a version,
-- not a foreign key.
--
-- The estate-page build is GATED on: a received promotion with verdict != REJECT AND the
-- developer's title being present (derived from developer_onboarding — see src/lib/deal-model/gate.ts).
--
-- Writes are service-role only; RLS is enabled deny-by-default (no anon/auth policies),
-- consistent with developer_onboarding (0046) and the anon lockdown (0027). Idempotent.

-- ─── PROMOTIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_promotions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stable cross-repo id = the DealFindrs opportunity id. NOT an FK (separate DB).
  deal_id            UUID NOT NULL,
  snapshot_version   INT  NOT NULL,          -- the DealFindrs snapshot version (v1 indicative, v2 bankable)
  grade              TEXT NOT NULL DEFAULT 'indicative',  -- 'indicative' | 'bankable'

  -- The verdict + denormalised headline economics (verbatim from the locked snapshot).
  verdict            TEXT NOT NULL,          -- 'GO' | 'ADJUST' | 'REJECT'
  developer_thin     BOOLEAN NOT NULL DEFAULT false,
  base_rate_per_lot  NUMERIC(14,2),
  net_uplift_pct     NUMERIC(6,5),
  stage_used         TEXT,

  -- The full immutable economics snapshot (DealModelResult), stored verbatim.
  snapshot           JSONB NOT NULL,

  -- Link to the local intake once matched (by deal_id or estate/email). Nullable until matched.
  onboarding_id      UUID REFERENCES developer_onboarding(id) ON DELETE SET NULL,

  source             TEXT NOT NULL DEFAULT 'dealfindrs',
  received_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Idempotency: re-POSTing the same deal+version is a no-op update, never a duplicate.
  UNIQUE (deal_id, snapshot_version)
);

CREATE INDEX IF NOT EXISTS idx_deal_promotions_deal ON deal_promotions(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_promotions_onboarding ON deal_promotions(onboarding_id);

ALTER TABLE deal_promotions ENABLE ROW LEVEL SECURITY;
-- No policies: deny-by-default for anon/auth. Service-role writes bypass RLS (like 0046).

-- ─── INTAKE LINK + BUILD-GATE STAMP ────────────────────────────
-- deal_id links the local intake to its DealFindrs deal; cleared_for_build_at is set ONLY
-- when the gate passes (verdict != REJECT AND title present) — the enforced green light for
-- building the estate page. Additive + idempotent.
ALTER TABLE developer_onboarding
  ADD COLUMN IF NOT EXISTS deal_id             UUID,
  ADD COLUMN IF NOT EXISTS cleared_for_build_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cleared_for_build_by TEXT;

CREATE INDEX IF NOT EXISTS idx_developer_onboarding_deal ON developer_onboarding(deal_id);
