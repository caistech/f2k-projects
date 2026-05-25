/**
 * Estate blog/gallery configuration. One shared blog+gallery system, driven by
 * this per-estate config — Branscombe + Seafields are added here (with their own
 * tables) once Hemp Homes proves the template. Per-estate tables keep each
 * estate's photos structurally separate (a Branscombe photo can never surface in
 * a Hemp Homes blog).
 */
export type EstateSlug = "hemp-homes" | "branscombe" | "seafields";

export interface EstateBlogConfig {
  slug: EstateSlug;
  name: string;
  /** Explanatory header copy for the blog/gallery page (what / why). */
  intro: string;
  accent: string; // hex
  /** Link back to the estate's marketing landing page. */
  landingPath: string;
  /** Supabase table names — parameterise the shared queries per estate. */
  postsTable: string;
  mediaTable: string;
  postMediaTable: string;
}

// Only estates with a configured (and migrated) blog appear here. Unlisted
// slugs 404 on /blog/<slug>. Branscombe + Seafields land here in step 2.
export const ESTATE_BLOGS: Partial<Record<EstateSlug, EstateBlogConfig>> = {
  "hemp-homes": {
    slug: "hemp-homes",
    name: "Hemp Homes",
    intro:
      "Build-in-public updates and photos from the Joey60 Hemp Edition — the design, material, engineering and prototyping journey toward Australia's eco-communities. New updates as each milestone happens.",
    accent: "#1B4332",
    landingPath: "/hemp-homes-for-eco-communities",
    postsTable: "hemp_homes_posts",
    mediaTable: "hemp_homes_media",
    postMediaTable: "hemp_homes_post_media",
  },
};

export function getEstateBlog(slug: string): EstateBlogConfig | null {
  return ESTATE_BLOGS[slug as EstateSlug] ?? null;
}

/** All configured estate blogs, for the /blog index + nav. */
export const ESTATE_BLOG_LIST: EstateBlogConfig[] = Object.values(ESTATE_BLOGS).filter(
  (c): c is EstateBlogConfig => Boolean(c),
);
