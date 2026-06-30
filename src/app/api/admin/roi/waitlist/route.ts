import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

// GET — F2K admin list of ROI waitlist registrations (artefact 1) with attribution + status,
// the surface for the "Send qualification form" action and the unassigned pool.
export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const estate = searchParams.get("estate");

  const supabase = createSupabaseService();

  // Estate slug→id (optional filter).
  let estateId: string | null = null;
  if (estate) {
    const { data: e } = await (supabase.from("estates") as any)
      .select("id")
      .eq("slug", estate.toLowerCase())
      .maybeSingle();
    estateId = e?.id ?? null;
  }

  let query = (supabase.from("waitlist_registrations") as any)
    .select(
      "id, name, email, mobile, buyer_category, status, consent_contact, nudged_at, qualification_sent_at, qualification_sent_by, submitted_at, introducing_agent_id",
    )
    .order("submitted_at", { ascending: false })
    .limit(500);
  if (estateId) query = query.eq("estate_id", estateId);

  const { data: rows, error } = await query;
  if (error) {
    console.error("admin roi waitlist list error:", error);
    return NextResponse.json({ error: "Failed to load waitlist" }, { status: 500 });
  }

  // Resolve agent names in one pass — covers both the introducing agent AND an agent who SENT
  // the form (qualification_sent_by = 'agent:<id>'), so admin sees who sent it.
  const agentIds = new Set<string>();
  for (const r of rows ?? []) {
    if (r.introducing_agent_id) agentIds.add(r.introducing_agent_id);
    if (typeof r.qualification_sent_by === "string" && r.qualification_sent_by.startsWith("agent:")) {
      agentIds.add(r.qualification_sent_by.slice("agent:".length));
    }
  }
  const agentNames: Record<string, string> = {};
  if (agentIds.size) {
    const { data: agents } = await (supabase.from("agents") as any)
      .select("id, name")
      .in("id", Array.from(agentIds));
    for (const a of agents ?? []) agentNames[a.id] = a.name;
  }

  // Human label for who sent the form.
  const senderLabel = (by: string | null): string | null => {
    if (!by) return null;
    if (by.startsWith("admin:")) return `Admin (${by.slice("admin:".length)})`;
    if (by.startsWith("agent:")) return agentNames[by.slice("agent:".length)] ?? "Agent";
    return by; // 'legacy' or other
  };

  const waitlist = (rows ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    mobile: r.mobile,
    buyer_category: r.buyer_category,
    status: r.status,
    consent_contact: r.consent_contact,
    nudged_at: r.nudged_at,
    qualification_sent_at: r.qualification_sent_at ?? null,
    qualification_sent_by: senderLabel(r.qualification_sent_by ?? null),
    submitted_at: r.submitted_at,
    introducing_agent_id: r.introducing_agent_id ?? null,
    agent_name: r.introducing_agent_id ? agentNames[r.introducing_agent_id] ?? "Unknown" : null,
  }));

  return NextResponse.json({ waitlist });
}
