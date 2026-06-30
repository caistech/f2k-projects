import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

/**
 * GET ?waitlist_id= — the append-only pipeline_events timeline for one buyer (the per-buyer
 * documentation). Newest first. Spec: docs/estate-buyer-pipeline-design.md.
 */
export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const waitlistId = searchParams.get("waitlist_id");
  if (!waitlistId) return NextResponse.json({ error: "Missing waitlist_id" }, { status: 400 });

  const supabase = createSupabaseService();
  const { data, error } = await (supabase.from("pipeline_events") as any)
    .select("id, event_type, from_value, to_value, reason_code, note, actor_type, actor_email, created_at")
    .eq("waitlist_id", waitlistId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("pipeline timeline error:", error);
    return NextResponse.json({ error: "Failed to load timeline" }, { status: 500 });
  }
  return NextResponse.json({ events: data ?? [] });
}
