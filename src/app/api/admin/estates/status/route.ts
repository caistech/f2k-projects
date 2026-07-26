import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminUser, hasPermission, auditLog } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";
import { ESTATE_STATUS_TAG } from "@/lib/estates/status";
import { notifyEstateStatusChange } from "@/lib/estates/archive-notify";
import { ESTATES, estateBySlug } from "@/data/estates";

export const dynamic = "force-dynamic";
// Notifying every agent + admin is a serial fan-out of Resend calls on the same request, so the
// operator sees a real result (who was told, who failed) instead of a fire-and-forget "saved".
export const maxDuration = 60;

interface StatusRow {
  slug: string;
  archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  archived_reason: string | null;
  status_notified_at: string | null;
  status_notified_count: number | null;
}

/**
 * GET — every estate in the registry with its current archived status (registry merged with the
 * DB flag, so a newly-added estate with no row yet reads as active).
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_estate_status")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseService();
  const { data, error } = await supabase
    .from("estate_status")
    .select(
      "slug, archived, archived_at, archived_by, archived_reason, status_notified_at, status_notified_count",
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bySlug = new Map(
    ((data as StatusRow[]) ?? []).map((r) => [r.slug, r]),
  );
  const estates = ESTATES.map((e) => {
    const row = bySlug.get(e.slug);
    return {
      slug: e.slug,
      name: e.name,
      href: e.href,
      stateName: e.stateAbbr === "MULTI" ? "Multi-state" : e.stateName,
      // `parked` is the CODE-level unlist flag (src/data/estates.ts). It hides the estate from
      // public surfaces just like `archived`, but is set in code (needs a deploy) — surfaced here
      // so an operator sees "Parked (unlisted)" rather than a misleading "Live".
      parked: Boolean(e.parked),
      archived: Boolean(row?.archived),
      archived_at: row?.archived_at ?? null,
      archived_by: row?.archived_by ?? null,
      archived_reason: row?.archived_reason ?? null,
      // Whether the CURRENT status was ever announced. A status change nobody was told about is
      // the failure this feature exists to prevent, so it is visible on the list, not buried.
      status_notified_at: row?.status_notified_at ?? null,
      status_notified_count: row?.status_notified_count ?? null,
    };
  });

  return NextResponse.json({ estates });
}

/**
 * POST { slug, archived, reason? } — activate (archived=false) or deactivate (archived=true) an
 * estate. Records who/when/why, writes an audit-log entry, and busts the estate-status cache tag so
 * every public surface reflects the change immediately (no deploy).
 */
export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_estate_status")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { slug?: string; archived?: boolean; reason?: string; notify?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim();
  const archived = Boolean(body.archived);
  const reasonText = (body.reason ?? "").trim();
  // Announcing the change is the default. Opting out is for the case where the operator has
  // already told everyone by hand (or is correcting a mis-click seconds later) — and it is
  // recorded, because "nobody was told" must never be an accident nobody can trace.
  const notify = body.notify !== false;

  if (!slug || !estateBySlug(slug)) {
    return NextResponse.json({ error: "Unknown estate" }, { status: 400 });
  }

  // Deactivating an estate hides a public page — a reason (≥10 chars) is required, mirroring the
  // material-change reason gate used across admin (e.g. AdminLotEditModal). Activating needs none.
  if (archived && reasonText.length < 10) {
    return NextResponse.json(
      { error: "A reason (at least 10 characters) is required to deactivate an estate." },
      { status: 400 },
    );
  }
  const reason = reasonText || null;

  const nowIso = new Date().toISOString();
  const supabase = createSupabaseService();
  const { error } = await supabase.from("estate_status").upsert(
    {
      slug,
      archived,
      archived_at: archived ? nowIso : null,
      archived_by: archived ? admin.email : null,
      archived_reason: archived ? reason : null,
      updated_at: nowIso,
      // Clear the previous announcement stamp: it belonged to the status we just replaced. Leaving
      // it would show a reactivated estate as "notified" on the strength of the deactivation email.
      status_notified_at: null,
      status_notified_count: null,
    },
    { onConflict: "slug" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // entity_id is a UUID column and an estate slug is text, so passing the slug there makes the
  // insert fail on an invalid-uuid cast — and auditLog only console.errors, so it fails SILENTLY.
  // That is why no estate_archived/estate_activated row has ever existed despite the toggle
  // claiming "the audit log records it with your email and timestamp" (found 2026-07-26: the live
  // Branscombe/Wavecrest/Dutton archives left no audit trail at all). The slug goes in details.
  await auditLog(
    admin.id,
    admin.email,
    archived ? "estate_archived" : "estate_activated",
    "estate",
    null,
    { slug, archived, reason, notify },
  );

  // Public surfaces read getArchivedSlugs() (tagged with ESTATE_STATUS_TAG) — bust it so the
  // landing map, nav, cards, state page and the estate page itself all update on next request.
  // Also gates every outbound comms path (lib/estates/comms.ts), so the freeze takes effect here.
  revalidateTag(ESTATE_STATUS_TAG);

  // Tell the people who work this estate. Deliberately AFTER the status is committed and the cache
  // busted, so the email never describes a state the site hasn't reached — and never runs at all if
  // the write failed. Best-effort by contract: a mail problem is reported, never raised, because
  // the status change itself already succeeded and must not be reported as a failure.
  const estate = estateBySlug(slug)!;
  const notification = notify
    ? await notifyEstateStatusChange({
        slug,
        estateName: estate.name,
        estateHref: `${(process.env.NEXT_PUBLIC_CANONICAL_URL ?? "").replace(/\/$/, "")}${estate.href}`,
        archived,
        reason,
        actorEmail: admin.email,
      })
    : null;

  if (notification) {
    await auditLog(
      admin.id,
      admin.email,
      "estate_status_notified",
      "estate",
      null,
      {
        slug,
        archived,
        sent: notification.sent,
        failed: notification.failed,
        agents_notified: notification.agentsNotified,
        clients_covered: notification.clientsCovered,
        unassigned_clients: notification.unassignedClients,
        errors: notification.errors,
      },
    );
  }

  return NextResponse.json({ ok: true, slug, archived, notification });
}
