-- 0032_estate_drive_connections.sql
-- Per-estate Google Drive connection for the generic estate media sync
-- (Branscombe + Seafields; Hemp Homes keeps its own hemp_homes_drive_connection).
-- One row per estate (keyed by slug), holding the OAuth token bundle + folder id
-- + sync telemetry. Service-role access only.

CREATE TABLE IF NOT EXISTS public.estate_drive_connections (
  estate TEXT PRIMARY KEY,
  -- Base64-encoded JSON of the Google OAuth token bundle. Decoded server-side only.
  encrypted_tokens TEXT,
  -- The Google Drive folder this estate syncs from (operator sets it per estate).
  folder_id TEXT,
  connected_email TEXT,
  paused BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  last_sync_files_seen INTEGER,
  last_sync_files_new INTEGER,
  last_sync_files_skipped INTEGER,
  last_sync_message TEXT,
  connected_by UUID REFERENCES auth.users(id),
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.estate_drive_connections (estate)
VALUES ('branscombe'), ('seafields')
ON CONFLICT (estate) DO NOTHING;

DROP TRIGGER IF EXISTS set_updated_at_estate_drive_connections ON public.estate_drive_connections;
CREATE TRIGGER set_updated_at_estate_drive_connections
  BEFORE UPDATE ON public.estate_drive_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.estate_drive_connections ENABLE ROW LEVEL SECURITY;
-- No public policies — service-role only (tokens are sensitive).

COMMENT ON TABLE public.estate_drive_connections IS
  'Per-estate Google Drive OAuth token bundle + folder config for the generic estate media sync (Branscombe/Seafields). Service-role only.';
