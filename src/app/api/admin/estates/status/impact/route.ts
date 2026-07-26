import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { previewEstateStatusImpact } from "@/lib/estates/archive-notify";
import { estateBySlug } from "@/data/estates";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/estates/status/impact?slug=<estate>
 *
 * Read-only preview of who a status change would reach, shown in the confirm dialog before the
 * operator commits. Deactivating an estate fans out real emails to external agents and puts a
 * "contact your buyers" obligation on them — that consequence has to be visible BEFORE the click,
 * not discovered in the response (PRODUCT_STANDARDS §9 consequence clarity).
 */
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_estate_status")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slug = (new URL(req.url).searchParams.get("slug") ?? "").trim();
  if (!slug || !estateBySlug(slug)) {
    return NextResponse.json({ error: "Unknown estate" }, { status: 400 });
  }

  try {
    return NextResponse.json(await previewEstateStatusImpact(slug));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Impact preview failed" },
      { status: 500 },
    );
  }
}
