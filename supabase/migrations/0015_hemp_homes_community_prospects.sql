-- 0015_hemp_homes_community_prospects.sql
-- Pipeline of eco-community / intentional-community candidates for the
-- Joey60 Hemp Edition placement program. One row per community.
--
-- Origin: V1 workbook (May 2026) compiled from a Claude LLM search.
-- Per the workbook's Notes & Sources sheet: ALL FIGURES INDICATIVE,
-- pre-AFSL, must be confirmed before external use.
--
-- Bundled here:
--   - hemp_homes_pricing_assumptions : singleton row driving the revenue
--     model. Editable from admin without code change.
--   - hemp_homes_community_prospects : the prospect rows themselves.
--   - hemp_homes_community_prospects_revenue : computed view that joins
--     prospects to assumptions and yields conservative/base/optimistic
--     revenue per row at mid pricing.

-- ============================================================================
-- PRICING ASSUMPTIONS (singleton)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hemp_homes_pricing_assumptions (
  id TEXT PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
  -- Joey60 price scenarios, AUD ex-site
  price_low NUMERIC NOT NULL DEFAULT 220000,
  price_mid NUMERIC NOT NULL DEFAULT 280000,
  price_high NUMERIC NOT NULL DEFAULT 340000,
  -- Capture-rate scenarios — fraction of indicative lots resulting in a sale
  capture_conservative NUMERIC NOT NULL DEFAULT 0.15,
  capture_base NUMERIC NOT NULL DEFAULT 0.30,
  capture_optimistic NUMERIC NOT NULL DEFAULT 0.50,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.hemp_homes_pricing_assumptions (id) VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS set_updated_at_hemp_homes_pricing_assumptions
  ON public.hemp_homes_pricing_assumptions;
CREATE TRIGGER set_updated_at_hemp_homes_pricing_assumptions
  BEFORE UPDATE ON public.hemp_homes_pricing_assumptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.hemp_homes_pricing_assumptions ENABLE ROW LEVEL SECURITY;
-- Service-role only.

-- ============================================================================
-- PROSPECTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hemp_homes_community_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- name + state slug for dedup
  location TEXT,
  region TEXT,
  state TEXT CHECK (state IN ('QLD','NSW','VIC','TAS','SA','WA','NT','ACT')),
  country TEXT NOT NULL DEFAULT 'AU',

  -- Pipeline classification — matches workbook waves
  wave INTEGER CHECK (wave IN (1, 2, 3)),
  status TEXT NOT NULL DEFAULT 'researched' CHECK (status IN (
    'researched','outreach_sent','in_conversation','committed','declined','paused'
  )),

  -- Public-facing identity
  website_url TEXT,

  -- Demand sizing (all INDICATIVE per workbook caveats)
  land_size_acres NUMERIC,
  current_members INTEGER,
  indicative_lot_potential INTEGER,

  -- Provenance + rationale
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
    'workbook','llm_research','manual','inbound'
  )),
  source_basis TEXT,
  source_url TEXT,

  -- Privacy gate — internal-only unless community has consented to public mention
  is_public_safe BOOLEAN NOT NULL DEFAULT false,

  -- Ops
  notes TEXT,
  added_by UUID REFERENCES auth.users(id),
  contact_owner UUID REFERENCES auth.users(id),
  last_contacted_at TIMESTAMPTZ,
  next_action TEXT,
  next_action_due TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hh_prospects_wave ON public.hemp_homes_community_prospects(wave);
CREATE INDEX IF NOT EXISTS idx_hh_prospects_status ON public.hemp_homes_community_prospects(status);
CREATE INDEX IF NOT EXISTS idx_hh_prospects_state ON public.hemp_homes_community_prospects(state);
CREATE INDEX IF NOT EXISTS idx_hh_prospects_source ON public.hemp_homes_community_prospects(source);

DROP TRIGGER IF EXISTS set_updated_at_hemp_homes_community_prospects
  ON public.hemp_homes_community_prospects;
CREATE TRIGGER set_updated_at_hemp_homes_community_prospects
  BEFORE UPDATE ON public.hemp_homes_community_prospects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.hemp_homes_community_prospects ENABLE ROW LEVEL SECURITY;

-- Public read policy GATED on the privacy flag — so a future public
-- gallery page can only ever see explicitly-consented rows.
DROP POLICY IF EXISTS "Public reads public-safe prospects"
  ON public.hemp_homes_community_prospects;
CREATE POLICY "Public reads public-safe prospects"
  ON public.hemp_homes_community_prospects FOR SELECT
  USING (is_public_safe = true);

-- ============================================================================
-- REVENUE VIEW (computed; not stored)
-- ============================================================================

CREATE OR REPLACE VIEW public.hemp_homes_community_prospects_revenue AS
SELECT
  p.*,
  COALESCE(p.indicative_lot_potential, 0)::numeric * a.capture_conservative * a.price_mid AS conservative_revenue,
  COALESCE(p.indicative_lot_potential, 0)::numeric * a.capture_base         * a.price_mid AS base_revenue,
  COALESCE(p.indicative_lot_potential, 0)::numeric * a.capture_optimistic   * a.price_mid AS optimistic_revenue
FROM public.hemp_homes_community_prospects p
CROSS JOIN public.hemp_homes_pricing_assumptions a
WHERE a.id = 'singleton';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.hemp_homes_community_prospects IS
  'Joey60 placement pipeline — one row per eco/intentional community. INDICATIVE figures per workbook caveats; not for external commitments pre-AFSL. is_public_safe defaults false — flip only with community consent.';

COMMENT ON TABLE public.hemp_homes_pricing_assumptions IS
  'Singleton row driving the revenue model on the prospects view. Edit price/capture rates from the admin to flex the sensitivity.';

COMMENT ON VIEW public.hemp_homes_community_prospects_revenue IS
  'Prospects joined to pricing assumptions; conservative/base/optimistic revenue computed at mid pricing per the workbook V1 convention.';
