import { NextResponse } from "next/server";
import { getAdminUser, hasPermission, auditLog } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";
import { notifyEstateStatusChange } from "@/lib/estates/archive-notify";
import { estateBySlug } from "@/data/estates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/admin/estates/status/notify { slug }
 *
 * Announce an estate's CURRENT status to its stakeholders, without changing that status.
 *
 * Two cases need this, and neither can be served by the toggle:
 *
 *   1. Estates archived before this feature existed (Branscombe went off market on 2026-07-18 and
 *      nobody was told). The only alternative would be to reactivate and re-archive — which would
 *      put a withdrawn development back on the public site for as long as that took.
 *   2. A send that partly failed, or an agent added to the estate after the announcement went out.
 *
 * It re-reads the status from the database rather than trusting a caller-supplied value, so the
 * email can never describe a state the site isn't actually in.
 */
export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_estate_status")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim();
  const estate = estateBySlug(slug);
  if (!slug || !estate) {
    return NextResponse.json({ error: "Unknown estate" }, { status: 400 });
  }

  const supabase = createSupabaseService();
  const { data: row, error } = await (supabase.from("estate_status") as any)
    .select("archived, archived_reason")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // No row = never toggled = live by default (matches the GET listing's registry merge).
  const archived = Boolean(row?.archived);
  const reason = (row?.archived_reason as string | null) ?? null;

  const notification = await notifyEstateStatusChange({
    slug,
    estateName: estate.name,
    estateHref: `${(process.env.NEXT_PUBLIC_CANONICAL_URL ?? "").replace(/\/$/, "")}${estate.href}`,
    archived,
    reason,
    actorEmail: admin.email,
  });

  // entity_id is UUID and the slug is text — passing it there fails the insert silently (see the
  // matching note in ../route.ts). The slug travels in details instead.
  await auditLog(admin.id, admin.email, "estate_status_notified", "estate", null, {
    slug,
    archived,
    resend: true,
    sent: notification.sent,
    failed: notification.failed,
    agents_notified: notification.agentsNotified,
    clients_covered: notification.clientsCovered,
    unassigned_clients: notification.unassignedClients,
    errors: notification.errors,
  });

  return NextResponse.json({ ok: true, slug, archived, notification });
}
