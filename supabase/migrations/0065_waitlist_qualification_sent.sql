-- 0065_waitlist_qualification_sent.sql
--
-- Explicit, attributed tracking of "the qualification (second) form link has been emailed to
-- this waitlist buyer". Shared by the admin pipeline AND the agent portal so BOTH see the same
-- sent / not-sent state, and EITHER can send it — an agent only for their own attributed leads,
-- an admin for any. Whatever one does reflects in the other (single source of truth).
--
-- Previously "sent" was inferred from `nudged_at`, which conflates the 48h auto-nudge with a
-- deliberate send and records no "who sent it". These two columns make it explicit + attributed.
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS + a guarded backfill.

ALTER TABLE public.waitlist_registrations
  ADD COLUMN IF NOT EXISTS qualification_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS qualification_sent_by text;  -- 'admin:<email>' | 'agent:<uuid>' | 'legacy'

COMMENT ON COLUMN public.waitlist_registrations.qualification_sent_at IS
  'When the qualification (second) form link was emailed to this buyer. Set by the admin or agent send action; NULL = not yet sent.';
COMMENT ON COLUMN public.waitlist_registrations.qualification_sent_by IS
  'Who sent the qualification form link: admin:<email> | agent:<uuid> | legacy (backfilled from nudged_at).';

-- Backfill: an existing nudged_at means the qualify link was already emailed (a manual send and
-- the auto-nudge both deliver the same covering email), so treat it as the sent timestamp.
UPDATE public.waitlist_registrations
   SET qualification_sent_at = nudged_at,
       qualification_sent_by = COALESCE(qualification_sent_by, 'legacy')
 WHERE nudged_at IS NOT NULL
   AND qualification_sent_at IS NULL;
