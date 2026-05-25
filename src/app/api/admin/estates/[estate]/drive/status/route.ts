import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";
import { getEstateBlog, estatePermission } from "@/lib/estates/blog-config";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: { estate: string };
}

export async function GET(_request: Request, { params }: RouteCtx) {
  const cfg = getEstateBlog(params.estate);
  if (!cfg || !cfg.driveEnabled) {
    return NextResponse.json({ error: "Drive not enabled for this estate" }, { status: 404 });
  }
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, estatePermission(cfg.slug, "media"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseService();
  const { data, error } = await (supabase.from("estate_drive_connections") as any)
    .select(
      "folder_id, connected_email, paused, last_sync_at, last_sync_files_seen, last_sync_files_new, last_sync_files_skipped, last_sync_message, connected_at",
    )
    .eq("estate", cfg.slug)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ connected: !!data?.connected_email, ...(data ?? {}) });
}
