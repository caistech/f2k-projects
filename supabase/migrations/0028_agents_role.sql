-- 0028_agents_role.sql
--
-- Agents role (Phase 1 canary). New external-partner identity + invite/code
-- onboarding fields + agent_id ownership on registrations + RLS giving an
-- authed agent read access ONLY to their own clients (defense-in-depth behind
-- the agent-scoped API). Built on the 0027-hardened base — re-introduces
-- `authenticated` access only in tightly self-scoped form, never USING(true).
--
-- Additive: new table, new nullable columns, new scoped policies. Existing
-- behaviour is unchanged until agent auth users exist (none yet).

BEGIN;

-- 1. agents — external partner identity, keyed to auth.users on activation.
CREATE TABLE IF NOT EXISTS public.agents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name            text NOT NULL,
  email           text NOT NULL UNIQUE,
  phone           text,
  agency          text,
  estate_access   text[] NOT NULL DEFAULT '{}',      -- {'seafields'} / {'seafields','branscombe'}
  active          boolean NOT NULL DEFAULT true,      -- Uwe "block" = set false
  status          text NOT NULL DEFAULT 'pending',    -- 'pending' | 'active'
  invite_token_hash text,                             -- HMAC of the invite link token
  invite_code_hash  text,                             -- HMAC of the human-entered code
  invite_expires_at timestamptz,
  invited_by      uuid,                               -- admin_users.id who created it
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- service role: full access (admin create / block / delete + server-side activation)
DROP POLICY IF EXISTS service_role_all_agents ON public.agents;
CREATE POLICY service_role_all_agents ON public.agents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- agent: read OWN row only (portal "who am I"). No anon/public access.
DROP POLICY IF EXISTS agent_reads_self ON public.agents;
CREATE POLICY agent_reads_self ON public.agents
  FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

-- 2. agent_id ownership on registrations. ON DELETE SET NULL: deleting an agent
--    keeps the registrations, just unlinks them.
ALTER TABLE public.seafields_registrations
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL;
ALTER TABLE public.branscombe_registrations
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_seafields_regs_agent_id   ON public.seafields_registrations(agent_id);
CREATE INDEX IF NOT EXISTS idx_branscombe_regs_agent_id  ON public.branscombe_registrations(agent_id);

-- 3. An ACTIVE agent reads ONLY their own clients (SELECT only — agents do not
--    write registrations in the canary). A non-agent authed user's subquery
--    returns NULL, so `agent_id = NULL` matches zero rows: no leak, no re-open
--    of the hole 0027 just closed. Reads are also fronted by an agent-scoped
--    API; this RLS is defense-in-depth.
DROP POLICY IF EXISTS agent_reads_own_seafields_regs ON public.seafields_registrations;
CREATE POLICY agent_reads_own_seafields_regs ON public.seafields_registrations
  FOR SELECT TO authenticated
  USING (agent_id = (SELECT a.id FROM public.agents a
                     WHERE a.auth_user_id = auth.uid() AND a.active));

DROP POLICY IF EXISTS agent_reads_own_branscombe_regs ON public.branscombe_registrations;
CREATE POLICY agent_reads_own_branscombe_regs ON public.branscombe_registrations
  FOR SELECT TO authenticated
  USING (agent_id = (SELECT a.id FROM public.agents a
                     WHERE a.auth_user_id = auth.uid() AND a.active));

COMMIT;
