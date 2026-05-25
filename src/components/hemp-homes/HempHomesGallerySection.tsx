import { createSupabaseServer } from "@/lib/supabase-server";
import HempHomesGallery, { type GalleryItem } from "./HempHomesGallery";

const ACCENT = "#1B4332";

/**
 * Public build-photo gallery. Reads `hemp_homes_media` (public-read RLS, see
 * migration 0027) for rows flagged `show_in_gallery`. Operators add photos via
 * the admin media library (/admin/hemp-homes/media) or the Google Drive sync.
 *
 * Renders nothing when there are no gallery photos yet, so a visitor never sees
 * an empty shell on the marketing page.
 */
export default async function HempHomesGallerySection() {
  let items: GalleryItem[] = [];
  try {
    const supabase = createSupabaseServer();
    const { data, error } = await (supabase.from("hemp_homes_media") as any)
      .select("id, kind, public_url, alt_text, caption")
      .eq("show_in_gallery", true)
      .order("created_at", { ascending: false });
    if (error || !data) return null;
    items = data as GalleryItem[];
  } catch {
    // Missing Supabase env or a transient read failure must hide the gallery,
    // never crash the marketing page. Degrade silently.
    return null;
  }

  if (items.length === 0) return null;

  return (
    <section id="gallery" className="py-16 px-4 bg-white border-t border-b border-black/5">
      <div className="max-w-[1100px] mx-auto">
        <p
          className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase mb-4"
          style={{ color: ACCENT }}
        >
          From the workshop
        </p>
        <h2 className="font-playfair text-[2rem] font-black text-deep-blue leading-tight mb-3">
          Photos from the build
        </h2>
        <p className="text-slate font-archivo leading-relaxed mb-10 max-w-[800px]">
          Real photos from the Joey60 Hemp Edition as it comes together — the
          workshop, the engineered hemp panels, the prototype. We add to this as
          the program moves through each stage. Tap any photo to view it full
          size.
        </p>
        <HempHomesGallery items={items} />
      </div>
    </section>
  );
}
