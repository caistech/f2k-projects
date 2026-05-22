-- 0020_hemp_homes_unsubscribe.sql
-- Records the unsubscribe event so we have a Spam Act 2003 audit trail.
-- The outreach_status='declined' enum value (added in 0019) is the gate
-- that prevents further sends; this column gives us the timestamp.

ALTER TABLE public.hemp_homes_community_prospects
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unsubscribed_ip_hash TEXT;

COMMENT ON COLUMN public.hemp_homes_community_prospects.unsubscribed_at IS
  'Set when an unsubscribe link is clicked. Pair with outreach_status=declined for the gating + auditable timestamp.';

COMMENT ON COLUMN public.hemp_homes_community_prospects.unsubscribed_ip_hash IS
  'Salted SHA-256 of the IP that clicked the unsubscribe link, for audit purposes. Null if the IP could not be captured.';

-- Rebuild the revenue view so p.* picks up the new columns.
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
