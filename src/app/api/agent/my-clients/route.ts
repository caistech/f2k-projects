import { NextResponse } from "next/server";
import { getAgentUser, agentCanAccessEstate } from "@/lib/agents/agent-auth";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

// An agent's own clients across the estates they can access — registrations
// explicitly tagged with their agent_id. Full detail (these are the agent's
// own buyers). Service-role read, scoped by agent_id; the agent_reads_own RLS
// policies (0028) are the defense-in-depth. Estates the agent cannot access
// return an empty array.
export async function GET() {
  const agent = await getAgentUser();
  if (!agent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const service = createSupabaseService();
  const out: { seafields: unknown[]; branscombe: unknown[] } = {
    seafields: [],
    branscombe: [],
  };

  if (agentCanAccessEstate(agent, "seafields")) {
    const { data, error } = await (service.from("seafields_registrations") as any)
      .select(
        "id, first_name, last_name, email, phone, lots_selected, interest_type, buyer_type, purchase_timeline, created_at",
      )
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false });
    if (error) console.error("agent my-clients seafields error:", error);
    out.seafields = data ?? [];
  }

  if (agentCanAccessEstate(agent, "branscombe")) {
    const { data, error } = await (
      service.from("branscombe_registrations") as any
    )
      .select(
        "id, first_name, last_name, email, phone, units_selected, buyer_type, purchase_timeline, created_at",
      )
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false });
    if (error) console.error("agent my-clients branscombe error:", error);
    out.branscombe = data ?? [];
  }

  return NextResponse.json(out);
}
