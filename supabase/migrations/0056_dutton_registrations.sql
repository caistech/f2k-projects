-- 0056_dutton_registrations.sql
--
-- Register-of-interest capture for Dutton Terrace (the first Archetype-C / master-planned
-- mixed-use estate built from a developer-onboarding submission — Zen Hartree, 2026-06-15).
--
-- Beyond the standard buyer fields it captures the DEMAND-VALIDATION anchors the funder
-- feasibility needs: interest_type (land vs H&L), lot_size_preference, and budget_band — the
-- "would they buy AT a price" signal that, × lot count, forms the revenue stack tested against
-- the cost stack for the ≥20% margin.
--
-- Service-role writes only (RLS deny-by-default, post-0027 secure pattern — NOT the old
-- wavecrest_registrations public-policy shape).

CREATE TABLE IF NOT EXISTS public.dutton_registrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estate_slug         TEXT NOT NULL DEFAULT 'dutton-terrace',
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  interest_type       TEXT,            -- vacant land / house & land / either
  lot_size_preference TEXT,            -- demand signal
  budget_band         TEXT,            -- the price-validation anchor (revenue-stack input)
  suburb              TEXT,
  postcode            TEXT,
  buyer_type          TEXT,
  buyer_profile       TEXT,
  current_housing     TEXT,
  purchase_timeline   TEXT,
  finance_status      TEXT,
  how_heard           TEXT,
  referrer_type       TEXT,
  referrer_name       TEXT,
  referrer_company    TEXT,
  referrer_contact    TEXT,
  notes               TEXT,
  consent             BOOLEAN NOT NULL DEFAULT FALSE,
  source              TEXT NOT NULL DEFAULT 'web-roi'
);

CREATE INDEX IF NOT EXISTS dutton_registrations_created_idx
  ON public.dutton_registrations (created_at DESC);

ALTER TABLE public.dutton_registrations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.dutton_registrations IS
  'Register-of-interest for Dutton Terrace (Archetype-C mixed-use). Captures budget_band + lot_size_preference for funder revenue-stack validation. Service-role writes only (RLS deny-by-default).';
