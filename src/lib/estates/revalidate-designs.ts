import { revalidatePath } from "next/cache";
import { estateBySlug } from "@/data/estates";

/**
 * Publish a design change to the public site.
 *
 * `revalidatePath` is the whole mechanism, and that is the conclusion of measuring rather than
 * reasoning. The first attempt used `revalidateTag` against an `unstable_cache`-wrapped read; a
 * card created through the API stayed invisible on the live page through 60s of polling. Adding
 * `revalidatePath` produced `x-vercel-cache: REVALIDATED` — proving the page really did re-render —
 * and the card STILL did not appear, because the re-render read the stale tagged cache entry. The
 * data-cache layer was removed rather than fought: the route cache is sufficient, and a second
 * layer that can silently serve stale copy to buyers is a liability, not an optimisation.
 *
 * The failure mode this closes is not cosmetic. The operator saves, sees the page unchanged, and
 * concludes the editor does not work.
 */
export function revalidateEstateDesigns(estateSlug: string): void {
  const estate = estateBySlug(estateSlug);
  if (estate?.href) revalidatePath(estate.href);
}
