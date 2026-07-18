-- 0072_estate_status.sql
--
-- Admin-controlled publish/archive toggle per estate, keyed by the code-registry slug
-- (src/data/estates.ts). Kept SEPARATE from the ROI-portal public.estates table (0062) so the
-- landing-page on/off switch never touches that table's representation/consent semantics.
--
-- archived = TRUE  -> the estate is hidden from EVERY public surface (nav mega-menu, the Australia
--   landing map, landing cards, the per-state page) exactly like the code-level `parked` flag, AND
--   the direct estate URL renders a "page archived" notice instead of the live page (NOT a 404).
--   The estate's data, registrations and admin sections are untouched — this archives, never deletes.
--
-- Writes: service-role only (RLS deny-by-default, post-0027 secure pattern — no anon/auth policy).
-- Reads happen server-side via the service role (src/lib/estates/status.ts).

CREATE TABLE IF NOT EXISTS public.estate_status (
  slug            TEXT PRIMARY KEY,
  archived        BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at     TIMESTAMPTZ,
  archived_by     TEXT,
  archived_reason TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.estate_status ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.estate_status IS
  'Admin publish/archive toggle per estate (slug = src/data/estates.ts registry slug). archived hides the estate from all public surfaces + shows a "page archived" notice at its URL (not a 404). Archives, never deletes. Service-role writes only.';

-- Seed a row for every estate currently in the registry (all active by default).
INSERT INTO public.estate_status (slug, archived)
VALUES
  ('seafields', FALSE),
  ('wavecrest', FALSE),
  ('dutton-terrace', FALSE),
  ('branscombe', FALSE),
  ('hemp-homes', FALSE)
ON CONFLICT (slug) DO NOTHING;
