import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminUser, hasPermission, auditLog } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";
import { ESTATE_STATUS_TAG } from "@/lib/estates/status";
import { ESTATES, estateBySlug } from "@/data/estates";

export const dynamic = "force-dynamic";

interface StatusRow {
  slug: string;
  archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  archived_reason: string | null;
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
    .select("slug, archived, archived_at, archived_by, archived_reason");
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

  let body: { slug?: string; archived?: boolean; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim();
  const archived = Boolean(body.archived);
  const reasonText = (body.reason ?? "").trim();

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
    },
    { onConflict: "slug" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await auditLog(
    admin.id,
    admin.email,
    archived ? "estate_archived" : "estate_activated",
    "estate",
    slug,
    { archived, reason },
  );

  // Public surfaces read getArchivedSlugs() (tagged with ESTATE_STATUS_TAG) — bust it so the
  // landing map, nav, cards, state page and the estate page itself all update on next request.
  revalidateTag(ESTATE_STATUS_TAG);

  return NextResponse.json({ ok: true, slug, archived });
}
