-- Developer onboarding — structured site details (sizing + parcel key)
--
-- Three optional, developer-owned fields that make the inflow actionable:
--   site_area_value/unit   — 4 ha vs 40 ha: the opportunity-scale signal (GBT checklist task 15).
--   dwellings_envisaged    — approx homes/lots: the absorption signal (can the market take it?).
--   lot_plan_reference     — the legal parcel key (e.g. "Lot 3 on DP 123456" / CT ref). This is
--                            what makes @caistech/property-services functional: derive the parcel
--                            → wind zone, LGA, zoning overlays, easements. The land-title upload is
--                            the human-readable backup; this is the machine-readable key.
--
-- All additive + idempotent; service-role writes only; RLS unchanged (0027/0046).

ALTER TABLE developer_onboarding
  ADD COLUMN IF NOT EXISTS site_area_value     NUMERIC,
  ADD COLUMN IF NOT EXISTS site_area_unit      TEXT,       -- 'ha' (default) | 'acres' | 'm2'
  ADD COLUMN IF NOT EXISTS dwellings_envisaged TEXT,       -- free-ish, e.g. "approx 25" / "20-30"
  ADD COLUMN IF NOT EXISTS lot_plan_reference  TEXT;       -- legal parcel key (multi-lot ok)
