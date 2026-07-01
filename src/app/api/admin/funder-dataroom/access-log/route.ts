import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

// GET — recent funder data-room activity (views, downloads, NDA, reports) with member names.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = createSupabaseService();
  const { data: events, error } = await (supabase.from("funder_dataroom_audit") as any)
    .select("id, funder_member_id, action, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: "Failed to load" }, { status: 500 });

  const ids = Array.from(new Set((events ?? []).map((e: any) => e.funder_member_id).filter(Boolean)));
  const names: Record<string, string> = {};
  if (ids.length) {
    const { data: members } = await (supabase.from("funder_members") as any)
      .select("id, full_name, email")
      .in("id", ids);
    for (const m of members ?? []) names[m.id] = m.full_name || m.email;
  }

  return NextResponse.json({
    events: (events ?? []).map((e: any) => ({
      ...e,
      member_name: e.funder_member_id ? names[e.funder_member_id] ?? "—" : "—",
    })),
  });
}
