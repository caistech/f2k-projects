-- 0014_hemp_homes_drive_connection.sql
-- Storage for the Google Drive OAuth refresh token + folder config used by
-- the Hemp Homes media sync. Single-row table (the product has one Drive
-- source folder) — id is hard-coded so upserts target the same row.

CREATE TABLE IF NOT EXISTS public.hemp_homes_drive_connection (
  id TEXT PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
  -- Base64-encoded JSON of the Google OAuth token bundle (refresh_token,
  -- access_token, expiry_date, scope). Decoded server-side only.
  encrypted_tokens TEXT,
  -- Google Drive folder ID this sync targets. Defaults to the folder
  -- documented in the hemp-homes-community-builder-spec memory; admin can
  -- change it via the UI.
  folder_id TEXT NOT NULL DEFAULT '1I3rbikNGgVtUXNwpvfU5ud67aTE3pfyQ',
  -- Email of the Google account that authorised the connection (display only).
  connected_email TEXT,
  -- Whether sync is paused (manual control + auto-pause on repeated failures).
  paused BOOLEAN NOT NULL DEFAULT false,
  -- Per-run telemetry — overwritten on every sync.
  last_sync_at TIMESTAMPTZ,
  last_sync_files_seen INTEGER,
  last_sync_files_new INTEGER,
  last_sync_files_skipped INTEGER,
  last_sync_message TEXT,
  -- Provenance
  connected_by UUID REFERENCES auth.users(id),
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the singleton row so the UI can read state without a special case.
INSERT INTO public.hemp_homes_drive_connection (id)
VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS set_updated_at_hemp_homes_drive_connection
  ON public.hemp_homes_drive_connection;
CREATE TRIGGER set_updated_at_hemp_homes_drive_connection
  BEFORE UPDATE ON public.hemp_homes_drive_connection
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.hemp_homes_drive_connection ENABLE ROW LEVEL SECURITY;
-- No public policies — service-role only.

COMMENT ON TABLE public.hemp_homes_drive_connection IS
  'Singleton row holding the OAuth refresh-token bundle + folder config for the Hemp Homes Drive sync. Service-role access only.';
