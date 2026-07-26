import { NextResponse } from "next/server";
import { isEstateArchived } from "@/lib/estates/status";

/**
 * Outbound-communication freeze for an archived estate.
 *
 * Archiving an estate (the /admin/estates toggle, migration 0072) hides its public pages — but
 * hiding a page does not stop the machinery behind it. Before this guard, an archived estate still
 * ran its 48h buyer nudge cron, still sent its daily digest, still accepted registrations through
 * a stale tab or a direct POST, and could still have a build-journal post emailed to its
 * subscribers. Buyers were being contacted about a development that had been pulled.
 *
 * So "archived" means BOTH halves: hidden AND silent. Every estate-scoped outbound path calls one
 * of these guards, and reactivating the estate restores all of them with no deploy.
 *
 * The read is `isEstateArchived`, which is tag-cached and fail-soft: a DB hiccup degrades to
 * "not archived" (comms continue) rather than silently freezing a live estate's follow-up. That is
 * the correct direction to fail for a marketing funnel — over-sending for one request is
 * recoverable, an invisible freeze on a live estate is not.
 */

/** True when the estate is archived and must not send or receive anything. */
export async function isEstateCommsPaused(slug: string): Promise<boolean> {
  return isEstateArchived(slug);
}

/** Copy shown to a member of the public who reaches an archived estate's form endpoint. */
export const ESTATE_ARCHIVED_PUBLIC_MESSAGE =
  "This development is not currently open for registrations. Your details have not been " +
  "submitted. If you have already registered your interest, your agent will be in touch.";

/**
 * Drop-in guard for a PUBLIC write route (registration / qualification forms).
 *
 * Returns a 410 response when the estate is archived — the resource is deliberately gone rather
 * than temporarily unavailable — or null when the estate is live:
 *
 *   const archived = await estateArchivedPublicGuard("branscombe");
 *   if (archived) return archived;
 *
 * Sits alongside registrationsMaintenanceGuard() (the global maintenance freeze); this one is
 * per-estate and operator-controlled.
 */
export async function estateArchivedPublicGuard(
  slug: string,
): Promise<NextResponse | null> {
  if (!(await isEstateCommsPaused(slug))) return null;
  return NextResponse.json(
    { error: ESTATE_ARCHIVED_PUBLIC_MESSAGE, estate_archived: true },
    { status: 410 },
  );
}

/**
 * Drop-in guard for an ADMIN-triggered outbound send (e.g. emailing a build-journal post to
 * subscribers). Returns a 409 naming the estate, so an operator sees WHY the send was refused and
 * what to do about it, rather than a silent no-op.
 */
export async function estateArchivedSendGuard(
  slug: string,
  estateName: string,
): Promise<NextResponse | null> {
  if (!(await isEstateCommsPaused(slug))) return null;
  return NextResponse.json(
    {
      error:
        `${estateName} is deactivated (archived), so emails to its registrants are stopped. ` +
        `Reactivate the estate in Admin → Estate Pages if you intend to resume communications.`,
      estate_archived: true,
    },
    { status: 409 },
  );
}
