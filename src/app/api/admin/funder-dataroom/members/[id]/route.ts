import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

// PATCH — revoke/reactivate a member or toggle deep-access. Body: { status? , deep_access_enabled? }
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) {
    if (!["active", "revoked"].includes(String(body.status))) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }
  if (body.deep_access_enabled !== undefined) {
    update.deep_access_enabled = !!body.deep_access_enabled;
    // Turning deep access OFF also drops any granted tier back to base.
    if (!body.deep_access_enabled) update.max_tier = "base";
  }

  const supabase = createSupabaseService();
  const { error } = await (supabase.from("funder_members") as any).update(update).eq("id", params.id);
  if (error) {
    console.error("funder member update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
