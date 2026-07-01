import { NextResponse } from "next/server";
import { getAgentUser } from "@/lib/agents/agent-auth";
import { createSupabaseService } from "@/lib/supabase-service";
import { logPipelineEvent, loadJourney } from "@/lib/roi/pipeline-server";
import { FINANCE_STATUSES, VIEWED_MODES, EXIT_REASON_LABELS } from "@/lib/roi/pipeline";

/**
 * POST — an AGENT acting on their OWN buyer's journey. Hard-scoped to leads attributed to this
 * agent (introducing_agent_id === agent.id). Agents drive the EARLY funnel + finance + drop-off;
 * contract-stage progression and advisor nomination stay admin-only (spec: docs/estate-buyer-pipeline-design.md).
 *
 * Allowed actions: mark_contacted | set_viewed | set_finance | withdraw | reactivate | add_note
 */
export async function POST(request: Request) {
  const agent = await getAgentUser();
  if (!agent) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { action, waitlist_id } = body as { action?: string; waitlist_id?: string };
  if (!action || !waitlist_id) {
    return NextResponse.json({ error: "Missing action or waitlist_id" }, { status: 400 });
  }

  const supabase = createSupabaseService();
  const j = await loadJourney(supabase, waitlist_id);
  if (!j) return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
  // Scope guard: an agent may only act on their own attributed leads.
  if (j.introducing_agent_id !== agent.id) {
    return NextResponse.json({ error: "Not your buyer" }, { status: 403 });
  }

  const actor = { type: "agent" as const, id: agent.id, email: agent.email };
  const update: Record<string, unknown> = {};

  switch (action) {
    case "mark_contacted": {
      // Only advances enquiry -> agent_contacted; never pulls a further-along buyer backward.
      if (j.pipeline_stage !== "enquiry") {
        return NextResponse.json({ ok: true, unchanged: true });
      }
      update.pipeline_stage = "agent_contacted";
      await apply(supabase, waitlist_id, update);
      await logPipelineEvent(supabase, {
        estateId: j.estate_id,
        waitlistId: waitlist_id,
        eventType: "stage_change",
        from: "enquiry",
        to: "agent_contacted",
        actor,
      });
      return NextResponse.json({ ok: true });
    }

    case "set_viewed": {
      const mode = String(body.mode || "");
      if (!(VIEWED_MODES as readonly string[]).includes(mode)) {
        return NextResponse.json({ error: "Invalid viewed mode" }, { status: 400 });
      }
      update.viewed_at = new Date().toISOString();
      update.viewed_mode = mode;
      await apply(supabase, waitlist_id, update);
      await logPipelineEvent(supabase, {
        estateId: j.estate_id,
        waitlistId: waitlist_id,
        eventType: "milestone",
        to: `viewed:${mode}`,
        actor,
      });
      return NextResponse.json({ ok: true });
    }

    case "set_finance": {
      const finance_status = String(body.finance_status || "");
      if (!(FINANCE_STATUSES as readonly string[]).includes(finance_status)) {
        return NextResponse.json({ error: "Invalid finance status" }, { status: 400 });
      }
      update.finance_status = finance_status;
      await apply(supabase, waitlist_id, update);
      await logPipelineEvent(supabase, {
        estateId: j.estate_id,
        waitlistId: waitlist_id,
        eventType: "finance",
        from: j.finance_status,
        to: finance_status,
        actor,
      });
      return NextResponse.json({ ok: true });
    }

    case "withdraw": {
      const reason_code = String(body.reason_code || "");
      if (!EXIT_REASON_LABELS[reason_code]) {
        return NextResponse.json({ error: "A withdrawal reason is required" }, { status: 400 });
      }
      const note = body.note ? String(body.note) : null;
      update.pipeline_state = "withdrawn";
      update.exit_stage = j.pipeline_stage;
      update.exit_reason = reason_code;
      update.exit_note = note;
      await apply(supabase, waitlist_id, update);
      await logPipelineEvent(supabase, {
        estateId: j.estate_id,
        waitlistId: waitlist_id,
        eventType: "state_change",
        from: j.pipeline_state,
        to: "withdrawn",
        reasonCode: reason_code,
        note,
        actor,
      });
      return NextResponse.json({ ok: true });
    }

    case "reactivate": {
      update.pipeline_state = "active";
      update.exit_reason = null;
      update.exit_note = null;
      update.exit_stage = null;
      await apply(supabase, waitlist_id, update);
      await logPipelineEvent(supabase, {
        estateId: j.estate_id,
        waitlistId: waitlist_id,
        eventType: "state_change",
        from: j.pipeline_state,
        to: "active",
        actor,
      });
      return NextResponse.json({ ok: true });
    }

    case "add_note": {
      const note = body.note ? String(body.note).trim() : "";
      if (!note) return NextResponse.json({ error: "Note is empty" }, { status: 400 });
      await logPipelineEvent(supabase, {
        estateId: j.estate_id,
        waitlistId: waitlist_id,
        eventType: "note",
        note,
        actor,
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Action not permitted for agents" }, { status: 400 });
  }
}

async function apply(
  supabase: ReturnType<typeof createSupabaseService>,
  waitlistId: string,
  update: Record<string, unknown>,
) {
  const { error } = await (supabase.from("waitlist_registrations") as any)
    .update(update)
    .eq("id", waitlistId);
  if (error) {
    console.error("agent pipeline update error:", error);
    throw new Error("update failed");
  }
}
