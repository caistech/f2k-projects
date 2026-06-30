import { NextResponse } from "next/server";
import { z } from "zod";
import { getAgentUser, agentCanAccessEstate } from "@/lib/agents/agent-auth";
import { createSupabaseService } from "@/lib/supabase-service";
import { isSuppressed } from "@/lib/email/unsubscribe";
import { buildQualifyUrl } from "@/lib/roi/qualify-link";
import { buildCoveringEmail } from "@/lib/roi/covering-email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://f2k-projects.vercel.app";

const schema = z.object({ waitlist_id: z.string().uuid() });

// POST — an AGENT sends the (agent-branded, pre-attributed, pre-filled) qualification-form link
// to one of THEIR OWN waitlist buyers. Hard-gated: the waitlist record's introducing_agent_id
// must equal the logged-in agent, and the agent must have access to that estate. Mirrors the
// admin send-qualification route (same covering email + suppression check + audit), but the
// agent can only ever reach their own attributed leads — never another agent's or the
// unassigned pool. The shared qualification_sent_* fields mean the send reflects in BOTH the
// admin pipeline and the agent's own portal.
export async function POST(request: Request) {
  const agent = await getAgentUser();
  if (!agent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "A waitlist id is required" }, { status: 400 });
  }

  const supabase = createSupabaseService();
  const { data: waitlist } = await (supabase.from("waitlist_registrations") as any)
    .select("id, estate_id, name, email, introducing_agent_id, status")
    .eq("id", parsed.data.waitlist_id)
    .maybeSingle();
  if (!waitlist) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Authorisation: an agent may only send to their OWN attributed leads.
  if (waitlist.introducing_agent_id !== agent.id) {
    return NextResponse.json(
      { error: "This buyer isn't attributed to you." },
      { status: 403 },
    );
  }

  // Respect unsubscribe (Spam Act) — never send to a suppressed address.
  if (await isSuppressed(waitlist.email)) {
    return NextResponse.json(
      { error: "This buyer has unsubscribed and can't be emailed." },
      { status: 400 },
    );
  }

  const { data: estate } = await (supabase.from("estates") as any)
    .select("slug, name")
    .eq("id", waitlist.estate_id)
    .maybeSingle();
  if (!estate) {
    return NextResponse.json({ error: "Estate not found" }, { status: 404 });
  }
  if (!agentCanAccessEstate(agent, estate.slug)) {
    return NextResponse.json(
      { error: "You don't have access to this estate." },
      { status: 403 },
    );
  }

  const qualifyUrl = buildQualifyUrl(SITE_URL, estate.slug, waitlist.id);
  const { subject, html } = buildCoveringEmail({
    buyerName: waitlist.name,
    buyerEmail: waitlist.email,
    estateName: estate.name,
    qualifyUrl,
    agentName: agent.name,
    agentPhone: agent.phone,
  });

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    // The Resend SDK returns API errors in `error` instead of throwing — check it, or a
    // rejected send looks like success.
    const { data, error: sendErr } = await resend.emails.send({
      to: waitlist.email,
      from:
        process.env.RESEND_FROM_EMAIL ||
        "Branscombe Estate <noreply@updates.corporateaisolutions.com>",
      subject,
      html,
    });
    if (sendErr) {
      console.error("agent send-qualification Resend error:", sendErr);
      return NextResponse.json(
        { error: `Email provider rejected the send: ${sendErr.message || "unknown error"}` },
        { status: 502 },
      );
    }
    console.log("agent send-qualification sent:", { id: data?.id, to: waitlist.email });
  } catch (err) {
    console.error("agent send-qualification email failed:", err);
    return NextResponse.json({ error: "Failed to send the email" }, { status: 500 });
  }

  // Mark sent (shared signal) + contacted + nudged so the 48h auto-nudge doesn't also fire.
  const nowIso = new Date().toISOString();
  await (supabase.from("waitlist_registrations") as any)
    .update({
      qualification_sent_at: nowIso,
      qualification_sent_by: `agent:${agent.id}`,
      nudged_at: nowIso,
      status: waitlist.status === "new" ? "contacted" : waitlist.status,
    })
    .eq("id", waitlist.id);

  await supabase.from("audit_log").insert({
    actor_email: agent.email,
    action: "roi_qualification_link_sent",
    entity_type: "waitlist_registration",
    entity_id: waitlist.id,
    details: { estate: estate.slug, email: waitlist.email, sent_by: "agent" },
  });

  return NextResponse.json({ success: true });
}
