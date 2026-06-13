-- Developer onboarding — auto property check (kickstart analysis)
--
-- On submit, when we have a location to geocode, we call @caistech/property-services
-- (derive) and store the result here: wind region/speed, BAL (bushfire), climate zone,
-- LGA, zoning, planning overlays, and torrens subdivision yield (maxLots). This is the
-- first-pass site due-diligence that lands with the enquiry — before anyone drives out.
--
-- Shape: { status: 'ok'|'skipped'|'error', ran_at, address, summary, wind_region, wind_speed,
--          bal, climate_zone, lga_name, lga_coverage, zoning_code, zoning_name,
--          subdivision_permitted, max_lots, overlays: [...], data: <full DeriveResponse.data> }
-- Additive + idempotent; service-role writes only; RLS unchanged (0027/0046).

ALTER TABLE developer_onboarding
  ADD COLUMN IF NOT EXISTS property_check JSONB;
