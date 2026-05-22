-- 0016_hemp_homes_prospect_contact_discovery.sql
-- Discovery columns for outbound outreach. Populated by a research pass
-- that crawls each prospect's website + contact page. The actual send
-- pipeline (templates, queue, Resend webhook) comes in a later migration.

ALTER TABLE public.hemp_homes_community_prospects
  ADD COLUMN IF NOT EXISTS contact_emails TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_form_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_discovery_notes TEXT,
  ADD COLUMN IF NOT EXISTS contact_discovered_at TIMESTAMPTZ;

COMMENT ON COLUMN public.hemp_homes_community_prospects.contact_emails IS
  'General inbox + named contact email addresses found by the discovery pass. Empty array if none found (some communities only expose a contact form).';

COMMENT ON COLUMN public.hemp_homes_community_prospects.contact_form_url IS
  'URL of a contact form when no email address is exposed.';

COMMENT ON COLUMN public.hemp_homes_community_prospects.contact_discovery_notes IS
  'Free-form notes from the discovery agent — e.g. labelled addresses like "membership inquiries: X; general: Y", or "form-only, no email".';
