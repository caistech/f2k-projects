-- 0067_finance_declared_split.sql
--
-- Separate SELF-DECLARED finance from VERIFIED finance (spec: docs/estate-buyer-pipeline-design.md §4).
--
-- The finance a buyer ticks on the initial waitlist form is a self-declaration ONLY — no
-- questioning, no broker, no credit check. It must not masquerade as the verified finance gate
-- (which F2K runs at stage 2+ via a nominated advisor). So:
--   * finance_declared (NEW) = the low-trust self-declaration. Informational; NEVER "finance-ready".
--   * finance_status         = the VERIFIED milestone. A fresh enquiry has never been checked, so it
--                              resets to 'unknown' and only advances through the advisor gate.
--
-- IDEMPOTENT: guarded so a re-run won't clobber a later gate-driven finance_status.

ALTER TABLE public.waitlist_registrations
  ADD COLUMN IF NOT EXISTS finance_declared TEXT;
COMMENT ON COLUMN public.waitlist_registrations.finance_declared IS
  'Self-declared finance from the initial registration form (low trust — no verification). Informational only; never counts as finance-ready. The verified track is finance_status.';

-- Move the carried self-declaration into finance_declared (only while it is still NULL).
UPDATE public.waitlist_registrations
SET finance_declared = finance_status
WHERE finance_declared IS NULL
  AND finance_status IS NOT NULL
  AND finance_status <> 'unknown';

-- Reset the verified track to 'unknown' for those we just moved (nobody has actually been checked).
UPDATE public.waitlist_registrations
SET finance_status = 'unknown'
WHERE finance_declared IS NOT NULL
  AND finance_status = finance_declared;
