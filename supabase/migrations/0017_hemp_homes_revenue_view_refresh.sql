-- 0017_hemp_homes_revenue_view_refresh.sql
-- Migration 0016 added contact_emails / contact_form_url / contact_phone /
-- contact_discovery_notes / contact_discovered_at to the prospects table,
-- but the hemp_homes_community_prospects_revenue view captured `p.*` at
-- creation time and doesn't see the new columns. Drop + recreate so the
-- view picks them up.

DROP VIEW IF EXISTS public.hemp_homes_community_prospects_revenue;

CREATE VIEW public.hemp_homes_community_prospects_revenue AS
SELECT
  p.*,
  COALESCE(p.indicative_lot_potential, 0)::numeric * a.capture_conservative * a.price_mid AS conservative_revenue,
  COALESCE(p.indicative_lot_potential, 0)::numeric * a.capture_base         * a.price_mid AS base_revenue,
  COALESCE(p.indicative_lot_potential, 0)::numeric * a.capture_optimistic   * a.price_mid AS optimistic_revenue
FROM public.hemp_homes_community_prospects p
CROSS JOIN public.hemp_homes_pricing_assumptions a
WHERE a.id = 'singleton';

COMMENT ON VIEW public.hemp_homes_community_prospects_revenue IS
  'Prospects joined to pricing assumptions; conservative/base/optimistic revenue computed at mid pricing per the workbook V1 convention.';
