-- 0069_funder_dataroom_rag.sql
--
-- Stage B of the funder data room: the RAG index for the "ask" feature. Uploaded documents are
-- extracted → chunked → embedded (OpenAI text-embedding-3-large @ 1536 dims) → stored here; the
-- ask agent retrieves tier-filtered chunks and Claude answers ONLY from them with citations.
-- Ported from the LingoPure investor dataroom (migration 0020). Spec: funder-dataroom-build memory.
--
-- Security: chunks are NEVER client-readable (RLS on, no policy → service-role only). The tier
-- filter lives INSIDE the SECURITY DEFINER match fn, and EXECUTE is revoked from clients, so a
-- base-tier funder can't call it to self-elevate — only the service-role server invokes it, passing
-- the tiers the caller's max_tier permits.

create extension if not exists vector;

-- ── Chunks (the RAG index) ───────────────────────────────────────────────────
create table if not exists public.funder_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.funder_documents(id) on delete cascade,
  confidentiality_tier text not null check (confidentiality_tier in ('base','deep')), -- denormalised for fast filtering
  page int,
  chunk_index int not null,
  content text not null,                     -- text, or a Claude-vision caption for image docs
  is_vision_caption boolean not null default false,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
create index if not exists funder_chunks_embedding_idx
  on public.funder_document_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists funder_chunks_tier_idx on public.funder_document_chunks (confidentiality_tier);
create index if not exists funder_chunks_document_idx on public.funder_document_chunks (document_id);
alter table public.funder_document_chunks enable row level security;  -- no policy → service-role only

-- ── Tier-filtered retrieval (the security boundary) ──────────────────────────
create or replace function public.match_funder_chunks(
  query_embedding vector(1536),
  allowed_tiers text[],
  match_count int default 12
)
returns table (
  chunk_id uuid,
  document_id uuid,
  display_name text,
  page int,
  content text,
  is_vision_caption boolean,
  confidentiality_tier text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id, c.document_id, d.display_name, c.page, c.content, c.is_vision_caption,
    c.confidentiality_tier,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.funder_document_chunks c
  join public.funder_documents d on d.id = c.document_id
  where c.confidentiality_tier = any(allowed_tiers)
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

revoke all on function public.match_funder_chunks(vector, text[], int) from public;
revoke all on function public.match_funder_chunks(vector, text[], int) from anon;
revoke all on function public.match_funder_chunks(vector, text[], int) from authenticated;
grant execute on function public.match_funder_chunks(vector, text[], int) to service_role;

-- Track ingestion state on the document registry (skip re-embedding unchanged files).
alter table public.funder_documents
  add column if not exists ingested_at timestamptz,
  add column if not exists chunk_count int not null default 0;
