-- 0030_hemp_homes_media_gallery_default.sql
--
-- Curation default. Newly uploaded / Drive-synced media must NOT auto-publish to
-- the public Hemp Homes gallery — the operator opts each item in via the Media
-- Library "Show on public site" toggle (admin/hemp-homes/media).
--
-- Before this migration the column defaulted to true, so every Drive sync pushed
-- raw phone dumps straight onto the public marketing page. This flips the default
-- to false for FUTURE inserts only. Existing rows are intentionally left as-is so
-- the currently-live gallery keeps showing until the operator prunes it down via
-- the toggle (see the curation UI shipped alongside this migration).
--
-- Additive + idempotent: only changes the column default; no data is rewritten.

ALTER TABLE public.hemp_homes_media
  ALTER COLUMN show_in_gallery SET DEFAULT false;

COMMENT ON COLUMN public.hemp_homes_media.show_in_gallery IS
  'Whether this item appears in the public Hemp Homes gallery. Defaults to false (0030) — operator opts in per item via the Media Library toggle. Public gallery query filters on show_in_gallery = true.';
