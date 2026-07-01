import { NextResponse } from "next/server";
import { getAgentUser, agentCanAccessEstate } from "@/lib/agents/agent-auth";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

// GET — an agent's OWN waitlist leads (artefact 1) across the estates they can access, with the
// shared qualification-sent status. This is the agent-side mirror of the admin waitlist surface:
// it shows which of the agent's attributed buyers still need the registration (second) form sent,
// and which have already been sent it (by the agent or by admin — same shared signal). Powers the
// portal's "Send registration form" action. Service-role read, hard-scoped by agent_id.
export async function GET() {
  const agent = await getAgentUser();
  if (!agent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createSupabaseService();
  const { data, error } = await (service.from("waitlist_registrations") as any)
    .select(
      "id, name, email, mobile, buyer_category, status, qualification_sent_at, submitted_at, pipeline_stage, pipeline_state, finance_status, viewed_at, viewed_mode, exit_reason, exit_stage, estate:estates(slug, name)",
    )
    .eq("introducing_agent_id", agent.id)
    .order("submitted_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("agent waitlist list error:", error);
    return NextResponse.json({ error: "Failed to load your leads" }, { status: 500 });
  }

  // Only surface estates this agent may access (defense-in-depth on top of the agent_id scope).
  const leads = (data ?? [])
    .filter((r: any) => r.estate?.slug && agentCanAccessEstate(agent, r.estate.slug))
    .map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      mobile: r.mobile,
      buyer_category: r.buyer_category,
      status: r.status,
      qualification_sent_at: r.qualification_sent_at,
      submitted_at: r.submitted_at,
      pipeline_stage: r.pipeline_stage ?? "enquiry",
      pipeline_state: r.pipeline_state ?? "active",
      finance_status: r.finance_status ?? "unknown",
      viewed_at: r.viewed_at ?? null,
      viewed_mode: r.viewed_mode ?? null,
      exit_reason: r.exit_reason ?? null,
      exit_stage: r.exit_stage ?? null,
      estate_slug: r.estate.slug,
      estate_name: r.estate.name,
    }));

  return NextResponse.json({ leads });
}
