import { revalidatePath } from "next/cache";
import { estateBySlug } from "@/data/estates";

/**
 * Publish a design change to the public site.
 *
 * The estate pages currently render per request (`force-dynamic`), so this is belt-and-braces
 * rather than the load-bearing mechanism — it is kept so the pages can go back to static caching
 * without the publish path silently becoming a no-op.
 *
 * Historical note, because the commit messages around this are misleading: a long hunt for a
 * "changes never reach the page" bug was chasing a phantom. The test estate (Wavecrest) is
 * ARCHIVED, so its page returns the archived notice and never reaches the designs read at all.
 * Propagation was subsequently verified properly against Seafields — an edit was live in 3s.
 */
export function revalidateEstateDesigns(estateSlug: string): void {
  const estate = estateBySlug(estateSlug);
  if (estate?.href) revalidatePath(estate.href);
}
