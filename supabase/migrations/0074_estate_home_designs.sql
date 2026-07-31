-- 0074_estate_home_designs.sql
--
-- Operator-editable home-design cards for the public estate pages (the "Factory2Key Home Designs"
-- gallery). Until now these lived as a hardcoded `SEAFIELDS_DESIGNS` array in
-- src/app/(public)/seafields-estate/page.tsx, so every copy tweak Uwe asked for — a floor area, a
-- price moving to "Price on application" — needed a developer, a commit and a deploy. Lennie went
-- looking for the editor in /admin on 2026-07-31 and there wasn't one. This table is that editor's
-- backing store.
--
-- Columns are deliberately TEXT, not numerics: the gallery renders `beds · size` and the price line
-- verbatim, and the operator writes those strings ("≈61m² internal · ~100m² with verandah &
-- carport", "Price on application"). Structured build-costing lives in seafields_dwelling_types —
-- that is a DIFFERENT concern (internal cost model, FK'd from lots) and must not be conflated with
-- public marketing copy.
--
-- Keyed by the code registry slug (src/data/estates.ts) so the table serves every estate, matching
-- the estate_status (0072) shape. Only Seafields renders a gallery today.
--
-- Writes: service-role only (RLS deny-by-default, post-0027 secure pattern — no anon/auth policy).
-- Reads happen server-side via the service role (src/lib/estates/home-designs.ts).
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.estate_home_designs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_slug     TEXT NOT NULL,
  -- Display order in the gallery. Ties break on name so the order is always deterministic.
  sort_order      INTEGER NOT NULL DEFAULT 0,
  name            TEXT NOT NULL,
  -- Eyebrow above the name, e.g. "GROH ELIGIBLE". Rendered uppercase by the card.
  tag             TEXT NOT NULL DEFAULT '',
  -- The two halves of the spec line: rendered as "<beds> · <size>".
  beds            TEXT NOT NULL DEFAULT '',
  size            TEXT NOT NULL DEFAULT '',
  detail          TEXT NOT NULL DEFAULT '',
  hero_url        TEXT,
  plan_url        TEXT,
  secondary_label TEXT,
  secondary_href  TEXT,
  -- The price anchor, verbatim: a figure ("$297,900") or a phrase ("Price on application").
  price_from      TEXT NOT NULL DEFAULT 'Price on application',
  -- Prefix before the price. NULL falls back to the gallery default "H&L from"; the empty string
  -- means "no prefix" and is what a POA card wants. The three states are distinct on purpose.
  price_label     TEXT,
  -- Unpublished rows stay in the table and vanish from the public page — archive, never delete.
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      TEXT
);

-- One card per name per estate: makes the seed below re-runnable and stops a double-click on
-- "Add design" from silently creating a duplicate card on a live public page.
CREATE UNIQUE INDEX IF NOT EXISTS uq_estate_home_designs_slug_name
  ON public.estate_home_designs (estate_slug, name);

CREATE INDEX IF NOT EXISTS idx_estate_home_designs_estate
  ON public.estate_home_designs (estate_slug, sort_order);

ALTER TABLE public.estate_home_designs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.estate_home_designs IS
  'Operator-editable home-design cards rendered by the public estate page gallery (DesignGallery). Keyed by the src/data/estates.ts registry slug. Free-text by design — the operator writes the spec and price strings verbatim. Distinct from seafields_dwelling_types, which is the internal build-cost catalogue. Service-role writes only; unpublish rather than delete.';

-- Every edit here changes a live public page, so it is audited at the DB level like lots and
-- stages — the API also stamps x-actor-email / x-audit-reason (see 0008).
DROP TRIGGER IF EXISTS trg_audit_estate_home_designs ON public.estate_home_designs;
CREATE TRIGGER trg_audit_estate_home_designs
  AFTER INSERT OR UPDATE OR DELETE ON public.estate_home_designs
  FOR EACH ROW EXECUTE FUNCTION audit_entity_change();

-- =====================================================================
-- SEED — the six Seafields cards, as they stand after Uwe's 2026-07-26 edits
-- =====================================================================
-- These mirror src/lib/estates/home-designs.ts SEAFIELDS_FALLBACK exactly. The code copy stays as
-- the degrade-don't-fake fallback for the case where this table is unreachable or was never seeded;
-- once seeded, the DB is the source of truth and the fallback is never consulted.
--
-- ON CONFLICT DO NOTHING: re-running this migration must never overwrite an operator's later edits.

INSERT INTO public.estate_home_designs
  (estate_slug, sort_order, name, tag, beds, size, detail, hero_url, plan_url, price_from, price_label, updated_by)
VALUES
  ('seafields', 10, 'Joey', 'ANCILLARY / DOWNSIZER', '2 bed · 2 bath',
   '≈61m² internal · ~100m² with verandah & carport',
   'Compact 2-bedroom 2-bathroom ancillary dwelling — master with ensuite, second bedroom, open living/kitchen, optional carport + verandah. Ideal as a downsizer, holiday let, or second dwelling on a larger lot.',
   '/seafields/designs/joey/coastal.jpg', '/seafields/designs/joey.png',
   '$297,900', 'House only — from', 'migration 0074'),

  ('seafields', 20, 'Koala', 'ANCILLARY / DUAL-OCC', '2 bed · 1 bath',
   '≈71m² internal · ~110m² with verandah & carport',
   'Two-bedroom one-bathroom ancillary dwelling with carport + verandah — a slightly larger footprint suited to granny-flat / dual-occupancy use on lots ≥600m² under R20.',
   '/seafields/designs/koala.png', '/seafields/designs/koala.png',
   '$327,700', 'House only — from', 'migration 0074'),

  ('seafields', 30, '3x2 Modular', 'GROH ELIGIBLE', '3 bed · 2 bath',
   '158m² internal · ~181m² with verandah',
   'GROH-approved 3-bedroom 2-bathroom modular home. Government Regional Officer Housing eligible. Suitable for first-home buyers and small families. House & land pricing on application.',
   '/seafields/designs/3x2.png', '/seafields/designs/3x2.png',
   'Price on application', '', 'migration 0074'),

  ('seafields', 40, '4x2 Modular', 'GROH ELIGIBLE', '4 bed · 2 bath',
   '162m² · ~192m² with verandah',
   'GROH-approved 4-bedroom 2-bathroom modular home. Larger family layout with the same modular delivery economics.',
   '/seafields/designs/4x2.png', '/seafields/designs/4x2.png',
   'Price on application', '', 'migration 0074'),

  ('seafields', 50, 'EMU', 'FAMILY HOME', '4 bed · 2 bath',
   '191m² home · 218m² with alfresco',
   'Elevate-series 4-bedroom 2-bathroom family home with theatre, study and walk-in robe, plus upgraded elevations, claddings, windows and entry. Optional alfresco and carport. House & land pricing on application.',
   '/seafields/designs/emu.png', '/seafields/designs/emu.png',
   'Price on application', '', 'migration 0074'),

  ('seafields', 60, 'BigRoo', 'PREMIUM', '4 bed · 2 bath + Theatre',
   '≈310m²',
   'Premium ≈310m² modular with dedicated theatre room and walk-in robes. Architect-designed kitchen feature. The flagship family home.',
   '/seafields/designs/bigroo.png', '/seafields/designs/bigroo.png',
   'Price on application', '', 'migration 0074')
ON CONFLICT (estate_slug, name) DO NOTHING;
