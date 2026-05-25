-- 0031_estate_media_posts_branscombe_seafields.sql
-- Step 2 of the portfolio blog: per-estate media + posts + post_media tables for
-- Branscombe and Seafields, mirroring the hemp_homes_* schema (migration 0013)
-- so the shared blog/gallery components work identically per estate.
--
-- Per-estate tables keep each estate's photos structurally separate — a
-- Branscombe photo physically cannot surface in a Seafields or Hemp Homes blog.
--
-- show_in_gallery DEFAULTS false from the start (the curation lesson from 0030):
-- new uploads/syncs are hidden until the operator opts each one in.
--
-- Additive + idempotent. RLS: public reads published posts + all media + the
-- post_media of published posts; everything else is service-role only.
-- Storage: one public-read bucket per estate.

-- set_updated_at() already exists (created in 0013); reused below.

DO $$
DECLARE
  estate text;
BEGIN
  FOREACH estate IN ARRAY ARRAY['branscombe', 'seafields'] LOOP

    -- ===== MEDIA =====
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS public.%I (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kind TEXT NOT NULL CHECK (kind IN ('image','video')),
        source TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('direct','drive')),
        storage_path TEXT NOT NULL UNIQUE,
        public_url TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        duration_seconds INTEGER,
        byte_size BIGINT,
        alt_text TEXT,
        caption TEXT,
        show_in_gallery BOOLEAN NOT NULL DEFAULT false,
        drive_file_id TEXT UNIQUE,
        drive_url TEXT,
        drive_synced_at TIMESTAMPTZ,
        drive_modified_at TIMESTAMPTZ,
        uploaded_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    $f$, estate || '_media');

    -- ===== POSTS =====
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS public.%I (
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
        hero_media_id UUID REFERENCES public.%I(id) ON DELETE SET NULL,
        published_at TIMESTAMPTZ,
        email_sent_at TIMESTAMPTZ,
        email_subject TEXT,
        email_preview TEXT,
        email_html TEXT,
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    $f$, estate || '_posts', estate || '_media');

    -- ===== POST_MEDIA JOIN =====
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS public.%I (
        post_id UUID NOT NULL REFERENCES public.%I(id) ON DELETE CASCADE,
        media_id UUID NOT NULL REFERENCES public.%I(id) ON DELETE RESTRICT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (post_id, media_id)
      );
    $f$, estate || '_post_media', estate || '_posts', estate || '_media');

    -- ===== INDEXES =====
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(published_at DESC) WHERE published_at IS NOT NULL;',
      'idx_' || estate || '_posts_published_at', estate || '_posts');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(drive_file_id) WHERE drive_file_id IS NOT NULL;',
      'idx_' || estate || '_media_drive_file_id', estate || '_media');

    -- ===== UPDATED_AT TRIGGER (posts) =====
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;',
      'set_updated_at_' || estate || '_posts', estate || '_posts');
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      'set_updated_at_' || estate || '_posts', estate || '_posts');

    -- ===== RLS =====
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', estate || '_media');
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', estate || '_posts');
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', estate || '_post_media');

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'public_read_media_' || estate, estate || '_media');
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true);', 'public_read_media_' || estate, estate || '_media');

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'public_read_published_' || estate, estate || '_posts');
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (published_at IS NOT NULL AND published_at <= now());',
      'public_read_published_' || estate, estate || '_posts');

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'public_read_post_media_' || estate, estate || '_post_media');
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.%I p WHERE p.id = %I.post_id
                AND p.published_at IS NOT NULL AND p.published_at <= now())
      );
    $f$, 'public_read_post_media_' || estate, estate || '_post_media', estate || '_posts', estate || '_post_media');

    -- ===== STORAGE BUCKET =====
    EXECUTE format($f$
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (%L, %L, true, 524288000,
        ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
      ON CONFLICT (id) DO NOTHING;
    $f$, estate || '-media', estate || '-media');

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', 'public_read_bucket_' || estate);
    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects FOR SELECT TO public USING (bucket_id = %L);
    $f$, 'public_read_bucket_' || estate, estate || '-media');

  END LOOP;
END $$;

COMMENT ON TABLE public.branscombe_media IS 'Media library for the Branscombe blog/gallery. Bucket: branscombe-media. Mirrors hemp_homes_media.';
COMMENT ON TABLE public.seafields_media IS 'Media library for the Seafields blog/gallery. Bucket: seafields-media. Mirrors hemp_homes_media.';
