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

  const { data: agent } = await service
    .from("agents")
    .select("name, estate_access")
    .eq("id", agentId)
    .single();

  const { data, error } = await service
    .from("agent_registrations_view")
    .select("registration_id, first_name, last_name, email, phone, buyer_type, purchase_timeline, created_at, estate, lots_selected, stage_name, lead_status, lot_statuses")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("agent clients error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const seafields = (data ?? []).filter((r: any) => r.estate === "seafields");
  const branscombe = (data ?? []).filter((r: any) => r.estate === "branscombe");

  return NextResponse.json({ 
    seafields, 
    branscombe,
    agent: agent || null
  });
}
