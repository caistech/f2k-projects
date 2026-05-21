import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_hemp_homes_media")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseService();
  const { data, error } = await (supabase.from("hemp_homes_drive_connection") as any)
    .select(
      "folder_id, connected_email, paused, last_sync_at, last_sync_files_seen, last_sync_files_new, last_sync_files_skipped, last_sync_message, connected_at",
    )
    .eq("id", "singleton")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    connected: !!data?.connected_email,
    ...(data ?? {}),
  });
}
