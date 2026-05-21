-- 0013_hemp_homes_community_builder.sql
-- Phase 1 foundation for the Hemp Homes community-builder.
-- Adds: posts, media library, journey entries (DB-backed), post-media join, email log.
-- Storage: creates the `hemp-homes-media` bucket with public read.
-- Locked spec: hemp-homes-community-builder-spec memory (2026-05-21).

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hemp_homes_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video')),
  source TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('direct','drive')),
  -- Supabase Storage (always populated — Drive files are mirrored on sync)
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,
  byte_size BIGINT,
  -- Editorial + accessibility
  alt_text TEXT,
  caption TEXT,
  show_in_gallery BOOLEAN NOT NULL DEFAULT true,
  -- Google Drive source metadata (NULL for direct uploads)
  drive_file_id TEXT UNIQUE,
  drive_url TEXT,
  drive_synced_at TIMESTAMPTZ,
  drive_modified_at TIMESTAMPTZ,
  -- Provenance
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hemp_homes_media_drive_file_id
  ON public.hemp_homes_media(drive_file_id) WHERE drive_file_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.hemp_homes_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  overview TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN (
    'design','material_development','engineering','prototyping',
    'building','certification','install','community'
  )),
  state TEXT NOT NULL DEFAULT 'in_progress' CHECK (state IN (
    'completed','in_progress','scheduled'
  )),
  hero_media_id UUID REFERENCES public.hemp_homes_media(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  email_subject TEXT,
  email_preview TEXT,
  email_html TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hemp_homes_post_media (
  post_id UUID NOT NULL REFERENCES public.hemp_homes_posts(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES public.hemp_homes_media(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, media_id)
);

CREATE TABLE IF NOT EXISTS public.hemp_homes_journey_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  date_label TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN (
    'design','material_development','engineering','prototyping',
    'building','certification','install','community'
  )),
  state TEXT NOT NULL DEFAULT 'scheduled' CHECK (state IN (
    'completed','in_progress','scheduled'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  hero_media_id UUID REFERENCES public.hemp_homes_media(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hemp_homes_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.hemp_homes_posts(id) ON DELETE SET NULL,
  subscriber_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resend_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
    'sent','bounced','complained','unsubscribed'
  ))
);

CREATE INDEX IF NOT EXISTS idx_hemp_homes_email_log_subscriber_sent
  ON public.hemp_homes_email_log(subscriber_email, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_hemp_homes_posts_published_at
  ON public.hemp_homes_posts(published_at DESC) WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hemp_homes_journey_entries_sort
  ON public.hemp_homes_journey_entries(sort_order);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_hemp_homes_posts ON public.hemp_homes_posts;
CREATE TRIGGER set_updated_at_hemp_homes_posts
  BEFORE UPDATE ON public.hemp_homes_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_hemp_homes_journey_entries ON public.hemp_homes_journey_entries;
CREATE TRIGGER set_updated_at_hemp_homes_journey_entries
  BEFORE UPDATE ON public.hemp_homes_journey_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.hemp_homes_posts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hemp_homes_media            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hemp_homes_post_media       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hemp_homes_journey_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hemp_homes_email_log        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads published posts" ON public.hemp_homes_posts;
CREATE POLICY "Public reads published posts"
  ON public.hemp_homes_posts FOR SELECT
  USING (published_at IS NOT NULL AND published_at <= now());

DROP POLICY IF EXISTS "Public reads all media" ON public.hemp_homes_media;
CREATE POLICY "Public reads all media"
  ON public.hemp_homes_media FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public reads post_media for published posts" ON public.hemp_homes_post_media;
CREATE POLICY "Public reads post_media for published posts"
  ON public.hemp_homes_post_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hemp_homes_posts p
      WHERE p.id = hemp_homes_post_media.post_id
        AND p.published_at IS NOT NULL
        AND p.published_at <= now()
    )
  );

DROP POLICY IF EXISTS "Public reads journey entries" ON public.hemp_homes_journey_entries;
CREATE POLICY "Public reads journey entries"
  ON public.hemp_homes_journey_entries FOR SELECT
  USING (true);

-- email_log has no public policy (admin/service-role only)

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hemp-homes-media',
  'hemp-homes-media',
  true,
  524288000, -- 500MB per file (videos)
  ARRAY[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can read hemp-homes-media bucket" ON storage.objects;
CREATE POLICY "Public can read hemp-homes-media bucket"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'hemp-homes-media');

-- ============================================================================
-- SEED: migrate hardcoded journey.ts entries to DB
-- ============================================================================

INSERT INTO public.hemp_homes_journey_entries (slug, date_label, stage, state, title, body, sort_order)
VALUES
  ('2026-q2-concept-design', '2026-Q2', 'design', 'in_progress',
   'Concept design on the table.',
   'We''re translating the Joey60 footprint into a hemp panel build: a 60m² single-storey, one-bedroom layout, designed for a community context. Open kitchen/living running the length, separate bedroom and bathroom, decking on the long side. The first layouts are circulating internally — we''ll share images on this page as soon as they''re shareable.',
   10),
  ('2026-q2-material-development', '2026-Q2', 'material_development', 'in_progress',
   'Hemp panel material work is underway.',
   'Our materials partner is developing the engineered hemp panel system that will form the walls, floor and roof skin of the Joey60 hemp edition. Sample work is in progress. We''ll publish the first physical sample on this page when it lands.',
   20),
  ('2026-q3-engineering-scheduled', '2026-Q3', 'engineering', 'scheduled',
   'Panel connection design and load testing scheduled.',
   'Our engineering partner is preparing the structural work — connection geometry, load tests, and the assembly approach that lets a community build the home on site. We''ll publish the test methodology and the first results here as they come in.',
   30),
  ('2026-q3-community-conversations', '2026-Q3', 'community', 'in_progress',
   'Conversations with potential lighthouse communities.',
   'We''re in conversation with eco-communities along Australia''s eastern seaboard about being the first to host a Joey60 hemp edition. We''ll name our first lighthouse community on this page once they''ve given us permission to do so. If your community would like to be considered, please tell us about it below.',
   40)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.hemp_homes_posts IS 'Editorial posts for the Hemp Homes community-builder. Admin-authored, LLM email body generated, public read for published rows only.';
COMMENT ON TABLE public.hemp_homes_media IS 'Media library (image + video) for posts, journey entries, and gallery. Storage bucket: hemp-homes-media.';
COMMENT ON TABLE public.hemp_homes_journey_entries IS 'DB-backed journey timeline entries (migrated from src/data/hemp-homes/journey.ts). Edit via /admin/hemp-homes/journey.';
COMMENT ON TABLE public.hemp_homes_email_log IS 'Per-send log of post emails to subscribers. Source for nudge-core frequency cap (2/week max per Hemp Homes spec).';
