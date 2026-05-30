import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: agentId } = await params;
  const service = createSupabaseService();

  const out: { seafields: unknown[]; branscombe: unknown[] } = {
    seafields: [],
    branscombe: [],
  };

  const { data: agent } = await service
    .from("agents")
    .select("estate_access")
    .eq("id", agentId)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const estates = agent.estate_access || [];

  if (estates.includes("seafields")) {
    const { data, error } = await (service.from("seafields_registrations") as any)
      .select("id, first_name, last_name, email, phone, lots_selected, interest_type, buyer_type, purchase_timeline, created_at, stage_name, lead_status, lot_statuses")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });
    if (error) console.error("agent clients seafields error:", error);
    out.seafields = (data ?? []).map((r: any) => ({ ...r, estate: "seafields" }));
  }

  if (estates.includes("branscombe")) {
    const { data, error } = await (service.from("branscombe_registrations") as any)
      .select("id, first_name, last_name, email, phone, units_selected, buyer_type, purchase_timeline, created_at, stage_name, lead_status")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });
    if (error) console.error("agent clients branscombe error:", error);
    out.branscombe = (data ?? []).map((r: any) => ({ ...r, estate: "branscombe" }));
  }

  return NextResponse.json(out);
}
