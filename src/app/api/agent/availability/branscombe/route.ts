import { NextResponse } from "next/server";
import { getAgentUser, agentCanAccessEstate } from "@/lib/agents/agent-auth";
import { createSupabaseService } from "@/lib/supabase-service";
import { UNITS, HOUSE_TYPE_INFO } from "@/lib/branscombe-units";

export const dynamic = "force-dynamic";

/**
 * Masked unit availability for agents (Branscombe). Identity-free by design,
 * per the agents-role spec masking rule + Dennis's 2026-05-27 decision:
 * returns status (available/reserved), size/type, the public retail price, and
 * an AGGREGATE interest count — but NEVER the holder's name (allocated_to),
 * wholesale price, dwelling overlay (admin notes), or any registrant identity.
 * "Who" and offered prices are visible only via My Clients (own clients).
 */
export async function GET() {
  const agent = await getAgentUser();
  if (!agent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!agentCanAccessEstate(agent, "branscombe")) {
    return NextResponse.json({ error: "No Branscombe access" }, { status: 403 });
  }

  const service = createSupabaseService();

  // Allocation rows — SAFE columns only. allocated_to is read solely to derive
  // a reserved boolean; it is never returned to the agent.
  const { data: allocs, error } = await (
    service.from("branscombe_unit_allocations") as any
  ).select("unit_number, retail_price, allocated_to");
  if (error) {
    console.error("agent branscombe availability error:", error);
    return NextResponse.json(
      { error: "Failed to load availability" },
      { status: 500 },
    );
  }
  const allocByNum = new Map<number, { retail_price: number | null; reserved: boolean }>();
  for (const a of allocs || []) {
    allocByNum.set(a.unit_number, {
      retail_price: a.retail_price ?? null,
      reserved: !!a.allocated_to,
    });
  }

  // Aggregate interest count per unit (no identity) from units_selected.
  const { data: regs } = await (
    service.from("branscombe_registrations") as any
  ).select("units_selected");
  const counts: Record<string, number> = {};
  for (const r of regs || []) {
    for (const uid of (r.units_selected || []) as string[]) {
      counts[uid] = (counts[uid] || 0) + 1;
    }
  }

  const units = UNITS.map((u) => {
    const a = allocByNum.get(u.unitNumber);
    const info = HOUSE_TYPE_INFO[u.type];
    return {
      unit_id: u.id,
      unit_number: u.unitNumber,
      type: u.type,
      zone: u.zone,
      description: info
        ? `${info.size} home + ${info.deck} · ${info.beds} bed / ${info.baths} bath`
        : null,
      status: a?.reserved ? "reserved" : "available",
      retail_price: a?.retail_price ?? null,
      interest_count: counts[u.id] || 0,
    };
  });

  return NextResponse.json({ units });
}
