-- 0020_seafields_bulk_price_bands.sql
--
-- Bulk retail_price application per Uwe sign-off 2026-05-22. Replaces
-- the per-sqm pricing model with four flat size bands (see Jira
-- F2KSFLDS-14). Stage premium ladder NOT applied here — Stage 1
-- launch pricing only; per-stage premium is a separate decision.
--
--   Compact   (≤520m²)      → $155,000
--   Standard  (521–620m²)   → $165,000
--   Family    (621–750m²)   → $185,000
--   Premium   (751–1000m²)  → $200,000
--   POA       (>1000m²)     → NULL (one 1522m² lot — too large for flat band)
--
-- Excluded from the update:
--   - allocation_bucket = 'heritage_retained' (no retail price applies)
--   - status = 'sold'                          (price locked at sale time)
--
-- Idempotent: migrations run once. Subsequent admin edits to
-- retail_price via the lot-edit modal are NOT clobbered by this file.

BEGIN;

WITH band_updates AS (
  UPDATE seafields_lot_allocations
  SET
    retail_price = CASE
      WHEN sqm <= 520  THEN 155000
      WHEN sqm <= 620  THEN 165000
      WHEN sqm <= 750  THEN 185000
      WHEN sqm <= 1000 THEN 200000
      ELSE NULL  -- POA, lots >1000m²
    END,
    updated_at = NOW()
  WHERE
    sqm IS NOT NULL
    AND (allocation_bucket IS DISTINCT FROM 'heritage_retained')
    AND (status IS DISTINCT FROM 'sold')
  RETURNING lot_number, retail_price
)
INSERT INTO audit_log (
  actor_id, actor_email, action, entity_type, entity_id, details
)
SELECT
  NULL,
  'system@bulk-pricing',
  'seafields_bulk_price_bands_applied',
  'seafields_lot_allocations',
  NULL,
  jsonb_build_object(
    'source', 'migration 0020',
    'authority', 'Uwe sign-off 2026-05-22 (Jira F2KSFLDS-14)',
    'bands', jsonb_build_object(
      'compact_to_520_m2', 155000,
      'standard_521_to_620_m2', 165000,
      'family_621_to_750_m2', 185000,
      'premium_751_to_1000_m2', 200000,
      'poa_over_1000_m2', NULL
    ),
    'exclusions', jsonb_build_array('heritage_retained', 'sold'),
    'rows_updated', (SELECT COUNT(*) FROM band_updates),
    'poa_rows', (SELECT COUNT(*) FROM band_updates WHERE retail_price IS NULL)
  );

COMMIT;
