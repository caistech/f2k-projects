import { revalidateTag, revalidatePath } from "next/cache";
import { estateBySlug } from "@/data/estates";
import { ESTATE_DESIGNS_TAG } from "@/lib/estates/home-designs";

/**
 * Publish a design change to the public site.
 *
 * `revalidateTag` alone is NOT enough and this was measured, not assumed: the estate pages are
 * statically prerendered (`○ Static` in the build output), and busting the tag clears the DATA cache
 * without evicting the page already sitting in the Full Route Cache. A card created through the API
 * stayed invisible on the live page for a full minute of polling — i.e. the operator would save,
 * see nothing change, and reasonably conclude the editor was broken.
 *
 * `revalidatePath` is the call that purges the rendered route, so both are needed: the tag for the
 * cached query, the path for the page built from it.
 */
export function revalidateEstateDesigns(estateSlug: string): void {
  revalidateTag(ESTATE_DESIGNS_TAG);
  const estate = estateBySlug(estateSlug);
  if (estate?.href) revalidatePath(estate.href);
}
