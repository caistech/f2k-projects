import { NextResponse } from "next/server";
import { getAgentUser } from "@/lib/agents/agent-auth";
import { createSupabaseService } from "@/lib/supabase-service";

export async function PATCH(request: Request) {
  const agent = await getAgentUser();
  if (!agent) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { name, phone, agency } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (agency !== undefined) updates.agency = agency;

  const service = createSupabaseService();
  const { data, error } = await (service.from("agents") as any)
    .update(updates)
    .eq("id", agent.id)
    .select("id, name, email, phone, agency")
    .single();

  if (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ agent: data });
}
