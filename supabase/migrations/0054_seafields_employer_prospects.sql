-- 0054_seafields_employer_prospects.sql
--
-- Outbound prospect list for the Seafields local-employer staff-accommodation campaign.
-- These are LOCAL GERALDTON BUSINESSES we are reaching OUT to (cold/warm B2B outreach),
-- distinct from seafields_employer_registrations (which captures employers who register
-- INBOUND interest via /seafields/employers). Source: the Midwest Geraldton Business list
-- (23 March 2026), six sector tabs.
--
-- One row per business. Writes/reads via the service-role client (RLS deny-by-default,
-- consistent with the 0027 lockdown + the funder/employer-registration tables). Carries an
-- outreach_status + an unsubscribe token so the campaign send is auditable and Spam-Act
-- compliant (functional unsubscribe).
--
-- Estate-scoped (estate_slug) so the same prospect machinery can serve a future estate.

CREATE TABLE IF NOT EXISTS public.seafields_employer_prospects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estate_slug         TEXT NOT NULL DEFAULT 'seafields',
  business_name       TEXT NOT NULL,
  sector              TEXT,                       -- source sheet (Aboriginal Owned / Civil Works / ...)
  service_desc        TEXT,                       -- primary service / builder type
  locality            TEXT,
  contact_person      TEXT,
  phone               TEXT,
  email               TEXT,                       -- primary public email (null = no email on file)
  additional_emails   TEXT,                       -- semicolon-separated extras, kept for reference
  website             TEXT,
  ownership_basis     TEXT,                       -- e.g. Yamatji-owned verification note
  source              TEXT NOT NULL DEFAULT 'midwest-geraldton-business-2026-03-23',
  -- Outreach state machine
  outreach_status     TEXT NOT NULL DEFAULT 'imported',
    -- imported | no_email | queued | emailed | bounced | replied | unsubscribed | suppressed
  emailed_at          TIMESTAMPTZ,
  unsubscribe_token   TEXT NOT NULL DEFAULT md5(gen_random_uuid()::text || clock_timestamp()::text),
  unsubscribed_at     TIMESTAMPTZ,
  notes               TEXT
);

-- Dedupe on email when present (case-insensitive); businesses without an email can repeat null.
CREATE UNIQUE INDEX IF NOT EXISTS seafields_employer_prospects_email_uniq
  ON public.seafields_employer_prospects (lower(email))
  WHERE email IS NOT NULL AND email <> '';

CREATE INDEX IF NOT EXISTS seafields_employer_prospects_status_idx
  ON public.seafields_employer_prospects (estate_slug, outreach_status);

-- Deny-by-default: RLS on, no public policy. Import + campaign send + admin reads use the
-- service-role key (bypasses RLS).
ALTER TABLE public.seafields_employer_prospects ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.seafields_employer_prospects IS
  'Outbound prospect list for the Seafields local-employer staff-accommodation campaign (Midwest Geraldton Business list, 2026-03-23). Service-role only (RLS deny-by-default). outreach_status drives the send; unsubscribe_token for Spam-Act-compliant opt-out.';
