import { unstable_cache } from "next/cache";
import { cache } from "react";
import { createSupabaseService } from "@/lib/supabase-service";

/**
 * Estate publish/archive status — the DB-backed layer behind the /admin estate on/off toggle.
 *
 * The estate REGISTRY (src/data/estates.ts) is code — flipping its `parked` flag needs a deploy.
 * This module reads the `estate_status` table (migration 0072) so an admin can archive/activate an
 * estate with a click. An archived estate is hidden from every public surface (like `parked`) AND
 * its own URL shows a "page archived" notice. Public visibility = `parked` (code) OR `archived` (DB).
 */

/** revalidateTag() target — bust this after an admin toggles an estate so public surfaces update. */
export const ESTATE_STATUS_TAG = "estate-status";

const loadArchivedSlugs = unstable_cache(
  async (): Promise<string[]> => {
    // Fail-soft, top to bottom: this read runs inside the prerendered (public) layout, so it must
    // NEVER throw — a missing env at build time or a DB hiccup at runtime degrades to "nothing
    // archived" (every estate stays live), never a broken build or a downed public site.
    try {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.SUPABASE_SERVICE_ROLE_KEY
      ) {
        return [];
      }
      const supabase = createSupabaseService();
      const { data, error } = await supabase
        .from("estate_status")
        .select("slug")
        .eq("archived", true);
      if (error) {
        console.error("[estate-status] load failed:", error.message);
        return [];
      }
      return (data ?? []).map((r) => (r as { slug: string }).slug);
    } catch (e) {
      console.error("[estate-status] load threw:", e);
      return [];
    }
  },
  ["estate-status-archived"],
  { tags: [ESTATE_STATUS_TAG] },
);

/** Slugs of estates currently archived (hidden from public surfaces). Deduped per request. */
export const getArchivedSlugs = cache(
  async (): Promise<Set<string>> => new Set(await loadArchivedSlugs()),
);

/** Is a single estate archived (deactivated by an admin)? */
export async function isEstateArchived(slug: string): Promise<boolean> {
  return (await getArchivedSlugs()).has(slug);
}
