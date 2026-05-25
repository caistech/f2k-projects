import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseServiceWithActor } from "@/lib/supabase-service";
import { getEstateBlog, estatePermission } from "@/lib/estates/blog-config";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: { estate: string };
}

// Sets the Google Drive folder this estate syncs from. Accepts a folder ID or a
// full Drive folder URL (the ID is extracted).
export async function POST(request: Request, { params }: RouteCtx) {
  const cfg = getEstateBlog(params.estate);
  if (!cfg || !cfg.driveEnabled) {
    return NextResponse.json({ error: "Drive not enabled for this estate" }, { status: 404 });
  }
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, estatePermission(cfg.slug, "media"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = String(body.folder_id ?? "").trim();
  // Accept a bare ID or a Drive URL like https://drive.google.com/drive/folders/<ID>
  const match = raw.match(/folders\/([A-Za-z0-9_-]+)/);
  const folderId = match ? match[1] : raw;
  if (!/^[A-Za-z0-9_-]{10,}$/.test(folderId)) {
    return NextResponse.json({ error: "That doesn't look like a Drive folder ID or URL." }, { status: 400 });
  }

  const supabase = createSupabaseServiceWithActor(admin.email, `set ${cfg.slug} drive folder`);
  const { error } = await (supabase.from("estate_drive_connections") as any)
    .update({ folder_id: folderId })
    .eq("estate", cfg.slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ folder_id: folderId });
}
