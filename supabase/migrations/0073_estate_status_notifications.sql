-- 0073_estate_status_notifications.sql
--
-- Stakeholder notification for the estate activate/deactivate toggle (0072).
--
-- Archiving an estate is not just a UI change — it changes the commercial status of a real
-- development. Everyone working it has to be told, and every automated communication has to stop.
-- 0072 did neither. This migration adds the record-keeping for the notification half:
--
--   * estate_status gains WHEN it was last announced + to how many people, so an operator can see
--     at a glance whether a toggle was ever communicated.
--   * estate_status_notifications is the per-recipient receipt: who was told, what status, how many
--     of THEIR registrants they were asked to contact, and whether they confirmed they did.
--
-- The acknowledgement column is load-bearing, not decoration. Registrants are deliberately NOT
-- emailed by the system when an estate goes off-market — whether to tell a buyer their development
-- is paused (and how) is the introducing agent's call, made outside this system. That means the
-- final step of the process is invisible to us unless the agent reports it back, so the notification
-- email carries a signed one-click "I've told my clients" link that stamps acknowledged_at here.
-- Without it, "the agents were emailed" is the only thing we could ever say; with it, an operator
-- can see which agents' waitlists have actually been informed and chase the ones that haven't.
--
-- Writes: service-role only (RLS deny-by-default, post-0027 secure pattern).

-- ============================================================================
-- estate_status — last-announced bookkeeping
-- ============================================================================
ALTER TABLE public.estate_status
  ADD COLUMN IF NOT EXISTS status_notified_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_notified_count INTEGER;

COMMENT ON COLUMN public.estate_status.status_notified_at IS
  'When the CURRENT archived value was last announced to stakeholders (agents + admins). NULL = this status change was never communicated.';
COMMENT ON COLUMN public.estate_status.status_notified_count IS
  'How many stakeholders were successfully emailed in that announcement.';

-- ============================================================================
-- estate_status_notifications — the per-recipient receipt
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.estate_status_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL,                    -- src/data/estates.ts registry slug
  archived          BOOLEAN NOT NULL,                 -- the status being announced (TRUE = went off-market)
  reason            TEXT,                             -- the operator's reason, as shown to the recipient
  recipient_email   TEXT NOT NULL,
  -- 'agent'            -> an external agent with estate_access for this estate
  -- 'admin'            -> an admin_users row
  -- 'notify_recipient' -> an active <estate>_notify_recipients row (digest/ops list)
  recipient_kind    TEXT NOT NULL CHECK (recipient_kind IN ('agent', 'admin', 'notify_recipient')),
  recipient_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  -- How many registrants this recipient owns for the estate — i.e. how many people they were asked
  -- to contact themselves. 0 for admins and for agents with no registrants.
  client_count      INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  error             TEXT,
  resend_message_id TEXT,
  triggered_by      TEXT,                             -- admin email that flipped the toggle
  -- Stamped when the agent clicks "I've told my clients" in the email (signed one-click link).
  acknowledged_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS esn_slug_created_idx
  ON public.estate_status_notifications (slug, created_at DESC);
CREATE INDEX IF NOT EXISTS esn_agent_idx
  ON public.estate_status_notifications (recipient_agent_id)
  WHERE recipient_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS esn_unacknowledged_idx
  ON public.estate_status_notifications (slug)
  WHERE acknowledged_at IS NULL AND client_count > 0;

ALTER TABLE public.estate_status_notifications ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.estate_status_notifications IS
  'Per-recipient receipt for estate activate/deactivate announcements (0072 toggle). Registrants are never emailed by the system on a status change — their introducing agent is told instead, with their own client list, and acknowledged_at records the agent confirming they passed it on. Service-role writes only.';
