-- 0023_seafields_public_view_prefers_retail_price.sql
--
-- Bug Uwe / Dennis flagged 2026-05-23: the lot info card on the public
-- subdivision plan still shows per-sqm-derived prices (e.g. Lot 318 595m²
-- showing $166,600 = 595 × $280) instead of the flat band price set by
-- migration 0022 (Lot 318 is Band B = $160k).
--
-- Root cause: seafields_public_lots view ignores retail_price entirely
-- and always computes land_total as sqm × COALESCE(land_rate_override,
-- stage_rate). The view was written before the band-pricing model
-- replaced the per-sqm ladder.
--
-- Fix: prefer the typed retail_price column when set, fall back to the
-- per-sqm formula otherwise. After migration 0022 every public lot
-- has retail_price set, so the formula path is dead code in practice
-- but stays as a safety fallback (e.g. for any future lot that gets
-- inserted with NULL retail).

CREATE OR REPLACE VIEW seafields_public_lots AS
SELECT
  sla.lot_number,
  sla.sqm,
  sla.x_pct,
  sla.y_pct,
  sla.status,
  sla.allocation_bucket,
  sla.public_label,
  sla.category,
  sla.zone,
  sla.stage_id,
  s.stage_number,
  s.stage_label,
  s.is_open_for_registration,
  -- Effective $/m² remains derived (informational only on the public
  -- cards). When retail_price is set, divide it by sqm to expose the
  -- implied per-m² rate; else fall back to the per-lot override or
  -- stage rate.
  CASE WHEN sla.display_price_to_public AND COALESCE(s.public_visible, TRUE)
       THEN COALESCE(
         CASE WHEN sla.retail_price IS NOT NULL AND sla.sqm > 0
              THEN sla.retail_price / sla.sqm
         END,
         sla.land_rate_override_per_sqm,
         s.rate_per_sqm
       )
       ELSE NULL
  END AS effective_rate_per_sqm,
  -- Land total: prefer the explicit retail_price band; fall back to
  -- the per-sqm × stage-rate formula for any unpriced row.
  CASE WHEN sla.display_price_to_public AND COALESCE(s.public_visible, TRUE)
       THEN COALESCE(
         sla.retail_price,
         sla.sqm * COALESCE(sla.land_rate_override_per_sqm, s.rate_per_sqm)
       )
       ELSE NULL
  END AS land_total,
  -- Total price = land + house cost (when an H&L package is configured).
  -- Uses the same retail-first logic for the land component.
  CASE WHEN sla.display_price_to_public AND COALESCE(s.public_visible, TRUE)
       THEN COALESCE(
         sla.retail_price,
         sla.sqm * COALESCE(sla.land_rate_override_per_sqm, s.rate_per_sqm)
       ) + COALESCE(sla.house_cost, 0)
       ELSE NULL
  END AS total_price,
  sla.land_only
FROM seafields_lot_allocations sla
LEFT JOIN stages s ON s.id = sla.stage_id
WHERE COALESCE(s.public_visible, TRUE) = TRUE;

GRANT SELECT ON seafields_public_lots TO anon, authenticated;

COMMENT ON VIEW seafields_public_lots IS
  'Public-safe projection of Seafields lot data. After migration 0023, land_total prefers the explicit retail_price column (band-pricing model from migration 0022) and falls back to the per-sqm × stage-rate formula for unpriced rows. Hides wholesale price, internal notes, intent-lock metadata. Suppresses prices when display_price_to_public=FALSE or stages.public_visible=FALSE.';
