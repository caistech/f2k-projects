import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getEstateBlog } from "@/lib/estates/blog-config";
import { renderMarkdown } from "@/lib/markdown";
import HempHomesGallery, { type GalleryItem } from "@/components/hemp-homes/HempHomesGallery";

export const dynamic = "force-dynamic";

interface PostRow {
  id: string;
  slug: string;
  title: string;
  overview: string;
  stage: string;
  state: string;
  hero_media_id: string | null;
  published_at: string | null;
}
interface MediaRow {
  id: string;
  kind: "image" | "video";
  public_url: string;
  caption: string | null;
  alt_text: string | null;
  show_in_gallery: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  design: "Design", material_development: "Materials", engineering: "Engineering",
  prototyping: "Prototyping", building: "Building", certification: "Certification",
  install: "Install", community: "Community",
};

// In-article images use a server-resized thumbnail; falls back to the original
// client-side if transforms are off (see HempHomesGallery).
function thumb(publicUrl: string, w = 1100, h = 700): string {
  if (!publicUrl.includes("/storage/v1/object/public/")) return publicUrl;
  return (
    publicUrl.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") +
    `?width=${w}&height=${h}&resize=contain&quality=75`
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

export function generateMetadata({ params }: { params: { estate: string } }): Metadata {
  const cfg = getEstateBlog(params.estate);
  if (!cfg) return { title: "Blog | F2K" };
  return { title: `${cfg.name} — Build Journal | F2K`, description: cfg.intro };
}

export default async function EstateBlogPage({ params }: { params: { estate: string } }) {
  const cfg = getEstateBlog(params.estate);
  if (!cfg) notFound();

  const nowIso = new Date().toISOString();

  let posts: PostRow[] = [];
  let media: MediaRow[] = [];
  const linksByPost = new Map<string, string[]>();
  try {
    const supabase = createSupabaseServer();
    const [{ data: postRows }, { data: mediaRows }, { data: linkRows }] = await Promise.all([
      (supabase.from(cfg.postsTable) as any)
        .select("id, slug, title, overview, stage, state, hero_media_id, published_at")
        .not("published_at", "is", null)
        .lte("published_at", nowIso)
        .order("published_at", { ascending: false }),
      (supabase.from(cfg.mediaTable) as any)
        .select("id, kind, public_url, caption, alt_text, show_in_gallery"),
      (supabase.from(cfg.postMediaTable) as any)
        .select("post_id, media_id, sort_order")
        .order("sort_order", { ascending: true }),
    ]);
    posts = (postRows ?? []) as PostRow[];
    media = (mediaRows ?? []) as MediaRow[];
    for (const l of (linkRows ?? []) as { post_id: string; media_id: string }[]) {
      const arr = linksByPost.get(l.post_id) ?? [];
      arr.push(l.media_id);
      linksByPost.set(l.post_id, arr);
    }
  } catch {
    // Degrade to an empty journal rather than crash the page.
  }

  const mediaById = new Map(media.map((m) => [m.id, m]));
  const galleryItems: GalleryItem[] = media
    .filter((m) => m.show_in_gallery)
    .map((m) => ({ id: m.id, kind: m.kind, public_url: m.public_url, alt_text: m.alt_text, caption: m.caption }));

  const accent = cfg.accent;
  const proseClass =
    "font-archivo text-slate leading-relaxed [&>p]:mb-4 [&>h2]:font-playfair [&>h2]:text-xl [&>h2]:font-black [&>h2]:text-deep-blue [&>h2]:mt-6 [&>h2]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1 [&>ul]:mb-4 [&_a]:underline";

  return (
    <main className="bg-off-white min-h-screen">
      {/* ===== HEADER ===== */}
      <section className="px-4 py-14 md:py-20 border-b border-black/5" style={{ backgroundColor: "#1A2744" }}>
        <div className="max-w-[1000px] mx-auto">
          <Link
            href="/blog"
            className="font-ibm-mono text-[0.6rem] tracking-[0.3em] uppercase text-white/50 hover:text-white border-b border-white/20 hover:border-white pb-0.5"
          >
            ← All build journals
          </Link>
          <h1 className="font-playfair text-[clamp(2rem,4vw,3rem)] font-black text-white leading-tight mt-5 mb-3">
            {cfg.name} — Build Journal
          </h1>
          <p className="text-white/70 font-archivo leading-relaxed max-w-[680px]">{cfg.intro}</p>
          <Link
            href={cfg.landingPath}
            className="inline-block mt-6 font-archivo text-sm text-white/80 hover:text-white border-b pb-0.5"
            style={{ borderColor: accent }}
          >
            Visit the {cfg.name} page →
          </Link>
        </div>
      </section>

      {/* ===== POSTS ===== */}
      <section className="px-4 py-14">
        <div className="max-w-[800px] mx-auto">
          <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase mb-8" style={{ color: accent }}>
            Latest updates
          </p>
          {posts.length === 0 ? (
            <p className="font-archivo text-slate/70">
              No updates published yet — they&apos;ll appear here as the build progresses.
            </p>
          ) : (
            <div className="space-y-16">
              {posts.map((post) => {
                const hero = post.hero_media_id ? mediaById.get(post.hero_media_id) : null;
                const attached = (linksByPost.get(post.id) ?? [])
                  .filter((id) => id !== post.hero_media_id)
                  .map((id) => mediaById.get(id))
                  .filter((m): m is MediaRow => Boolean(m));
                return (
                  <article key={post.id}>
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span
                        className="font-ibm-mono text-[0.55rem] tracking-[0.3em] uppercase px-2 py-0.5 text-white"
                        style={{ backgroundColor: accent }}
                      >
                        {STAGE_LABELS[post.stage] ?? post.stage}
                      </span>
                      <span className="font-ibm-mono text-[0.55rem] tracking-[0.3em] uppercase text-slate/50">
                        {fmtDate(post.published_at)}
                      </span>
                    </div>
                    <h2 className="font-playfair text-[1.8rem] md:text-[2.2rem] font-black text-deep-blue leading-tight mb-5">
                      {post.title}
                    </h2>
                    {hero && hero.kind === "image" && (
                      <figure className="mb-6 border border-black/10 bg-warm-grey/40 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb(hero.public_url)}
                          alt={hero.alt_text || hero.caption || post.title}
                          loading="lazy"
                          className="w-full h-auto"
                        />
                        {hero.caption && (
                          <figcaption className="mt-2 font-archivo text-xs text-slate/60">{hero.caption}</figcaption>
                        )}
                      </figure>
                    )}
                    <div className={proseClass} dangerouslySetInnerHTML={{ __html: renderMarkdown(post.overview) }} />
                    {attached.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
                        {attached.map((m) =>
                          m.kind === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={m.id}
                              src={thumb(m.public_url, 600, 450)}
                              alt={m.alt_text || m.caption || ""}
                              loading="lazy"
                              className="w-full h-40 object-cover border border-black/10"
                            />
                          ) : (
                            <video key={m.id} src={m.public_url} className="w-full h-40 object-cover border border-black/10 bg-slate-900" controls />
                          ),
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== GALLERY ===== */}
      {galleryItems.length > 0 && (
        <section className="px-4 py-14 bg-white border-t border-black/5">
          <div className="max-w-[1100px] mx-auto">
            <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase mb-4" style={{ color: accent }}>
              Photo gallery
            </p>
            <h2 className="font-playfair text-[1.8rem] font-black text-deep-blue leading-tight mb-3">
              From the {cfg.name} build
            </h2>
            <p className="text-slate font-archivo leading-relaxed mb-10 max-w-[800px]">
              A curated selection from the build so far. Tap any photo to view it full size.
            </p>
            <HempHomesGallery items={galleryItems} />
          </div>
        </section>
      )}
    </main>
  );
}
