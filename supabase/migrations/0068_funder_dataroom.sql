-- 0068_funder_dataroom.sql
--
-- The FUNDER DATAROOM (spec: docs/estate-buyer-pipeline-design.md is the pipeline; this is a
-- separate, gated data-room for banks/funders). A THIRD audience alongside admins + agents: a
-- funder member logs into /dataroom, accepts an NDA, sees uploaded documents (tier-gated), and
-- pulls reports — scoped to funder information ONLY. Modelled on the LingoPure investor dataroom
-- (reusable shape; @caistech/dataroom extraction candidate) + f2k's agent invite/auth pattern.
--
-- Stage A (this migration): role + members + NDA + documents registry + audit + reports + private
-- Storage bucket. Stage B (later) adds the RAG chunk index + retrieval fn (pgvector).
--
-- RLS posture: funder_documents is NEVER client-readable (RLS on, no policy → service-role only;
-- files served as signed URLs). Member-owned rows (members/nda/audit/reports) are self-select by
-- auth.uid(). All writes go through the service-role server. Idempotent.

-- ── 1. Funder members (the ROLE) — agent-style invite (auth_user_id nullable until activated) ──
create table if not exists public.funder_members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,                          -- linked on activation; nullable while invited
  full_name text,
  firm text,
  email text not null unique,
  -- NDA-driven access tier: 'base' (no NDA) → 'deep' (NDA accepted + deep access enabled).
  max_tier text not null default 'base' check (max_tier in ('base','deep')),
  deep_access_enabled boolean not null default false,  -- admin entitlement; NDA only unlocks the invited
  nda_accepted_at timestamptz,
  nda_version text,
  nda_signer_name text,
  status text not null default 'invited' check (status in ('invited','active','revoked')),
  invite_token_hash text,
  invite_expires_at timestamptz,
  invited_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists funder_members_auth_idx on public.funder_members (auth_user_id);
create index if not exists funder_members_email_idx on public.funder_members (lower(email));
alter table public.funder_members enable row level security;
comment on table public.funder_members is
  'Funder/bank dataroom members (the funder role). Invite → activate (auth_user_id linked). max_tier gated by NDA. Service-role writes only.';

-- ── 2. Durable NDA acceptance ledger ─────────────────────────────────────────
create table if not exists public.funder_nda_acceptances (
  id uuid primary key default gen_random_uuid(),
  funder_member_id uuid not null references public.funder_members(id) on delete cascade,
  nda_version text not null,
  signer_name text not null,
  ip_address text,
  user_agent text,
  accepted_at timestamptz not null default now()
);

-- ── 3. Document registry (one row per uploaded file) ─────────────────────────
create table if not exists public.funder_documents (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  category text not null default 'other',      -- financial | legal | market | project | other
  confidentiality_tier text not null default 'base' check (confidentiality_tier in ('base','deep')),
  format text not null,                         -- pdf | docx | xlsx | png | jpeg | ...
  storage_path text not null,                   -- path in the private 'funder-dataroom' bucket
  file_size bigint,
  uploaded_by text,
  created_at timestamptz not null default now()
);
create index if not exists funder_documents_tier_idx on public.funder_documents (confidentiality_tier);
alter table public.funder_documents enable row level security;  -- no policy → service-role only
comment on table public.funder_documents is
  'Funder dataroom document registry. Files live in the private funder-dataroom bucket; served only as tier-checked, audited signed URLs. Never client-readable.';

-- ── 4. Audit — every view/download/nda/report (confidentiality-critical) ─────
create table if not exists public.funder_dataroom_audit (
  id uuid primary key default gen_random_uuid(),
  funder_member_id uuid references public.funder_members(id) on delete set null,
  action text not null,                         -- doc_view | download | report_generate | nda_accept | login
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists funder_audit_member_idx on public.funder_dataroom_audit (funder_member_id, created_at);

-- ── 5. Generated reports (re-download + audit trail) ─────────────────────────
create table if not exists public.funder_reports (
  id uuid primary key default gen_random_uuid(),
  funder_member_id uuid references public.funder_members(id) on delete cascade,
  report_type text not null,
  spec jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists funder_reports_member_idx on public.funder_reports (funder_member_id, created_at);

-- ── 6. Private Storage bucket for the original files ─────────────────────────
insert into storage.buckets (id, name, public)
values ('funder-dataroom', 'funder-dataroom', false)
on conflict (id) do nothing;

-- ── 7. RLS — member-owned rows self-select; corpus is service-role only ──────
alter table public.funder_nda_acceptances enable row level security;
alter table public.funder_dataroom_audit  enable row level security;
alter table public.funder_reports         enable row level security;

drop policy if exists "funder_members_self_select" on public.funder_members;
create policy "funder_members_self_select" on public.funder_members
  for select to authenticated using (auth_user_id = auth.uid());

drop policy if exists "funder_nda_self_select" on public.funder_nda_acceptances;
create policy "funder_nda_self_select" on public.funder_nda_acceptances
  for select to authenticated using (
    funder_member_id in (select id from public.funder_members where auth_user_id = auth.uid())
  );

drop policy if exists "funder_audit_self_select" on public.funder_dataroom_audit;
create policy "funder_audit_self_select" on public.funder_dataroom_audit
  for select to authenticated using (
    funder_member_id in (select id from public.funder_members where auth_user_id = auth.uid())
  );

drop policy if exists "funder_reports_self_select" on public.funder_reports;
create policy "funder_reports_self_select" on public.funder_reports
  for select to authenticated using (
    funder_member_id in (select id from public.funder_members where auth_user_id = auth.uid())
  );
