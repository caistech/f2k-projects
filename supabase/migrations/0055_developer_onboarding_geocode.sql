-- 0055_developer_onboarding_geocode.sql
--
-- Capture the precise selected location (state + coordinates) from the Mapbox address
-- autocomplete on the developer-onboarding form, so the first-pass property check geocodes
-- exactly instead of guessing from a free-typed "location" + an un-geocodable plan reference
-- (which sent an SA address to a Gold Coast QLD point — Zen Hartree / Dutton Terrace, 2026-06-15).
--
-- property-services derive accepts lat/lng/state to skip re-geocoding; these columns feed it.

ALTER TABLE public.developer_onboarding
  ADD COLUMN IF NOT EXISTS estate_state TEXT,
  ADD COLUMN IF NOT EXISTS estate_lat   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS estate_lng   DOUBLE PRECISION;
