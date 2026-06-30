import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";
import { logPipelineEvent, loadJourney } from "@/lib/roi/pipeline-server";
import {
  isValidStage,
  PIPELINE_STATES,
  FINANCE_STATUSES,
  VIEWED_MODES,
  EXIT_REASON_LABELS,
} from "@/lib/roi/pipeline";

/**
 * POST — admin actions on a buyer's pipeline journey. Every action writes the underlying state on
 * waitlist_registrations AND appends a pipeline_events row (the audit timeline). Spec:
 * docs/estate-buyer-pipeline-design.md.
 *
 * Body: { action, waitlist_id, ...payload }
 *   set_stage   { stage }
 *   withdraw    { reason_code, note? }
 *   hold        { note? }
 *   reactivate  {}
 *   set_viewed  { mode }
 *   set_finance { finance_status, advisor_id?, conditional_amount?, note? }
 *   add_note    { note }
 */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { action, waitlist_id } = body as { action?: string; waitlist_id?: string };
  if (!action || !waitlist_id) {
    return NextResponse.json({ error: "Missing action or waitlist_id" }, { status: 400 });
  }

  const supabase = createSupabaseService();
  const j = await loadJourney(supabase, waitlist_id);
  if (!j) return NextResponse.json({ error: "Buyer not found" }, { status: 404 });

  const actor = { type: "admin" as const, id: admin.id, email: admin.email };
  const update: Record<string, unknown> = {};

  switch (action) {
    case "set_stage": {
      const stage = String(body.stage || "");
      if (!isValidStage(stage)) {
        return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
      }
      if (stage === j.pipeline_stage) {
        return NextResponse.json({ ok: true, unchanged: true });
      }
      update.pipeline_stage = stage;
      await applyAndLog(supabase, waitlist_id, update, {
        estateId: j.estate_id,
        waitlistId: waitlist_id,
        eventType: "stage_change",
        from: j.pipeline_stage,
        to: stage,
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
      update.exit_stage = j.pipeline_stage; // captured automatically
      update.exit_reason = reason_code;
      update.exit_note = note;
      await applyAndLog(supabase, waitlist_id, update, {
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

    case "hold": {
      const note = body.note ? String(body.note) : null;
      update.pipeline_state = "on_hold";
      await applyAndLog(supabase, waitlist_id, update, {
        estateId: j.estate_id,
        waitlistId: waitlist_id,
        eventType: "state_change",
        from: j.pipeline_state,
        to: "on_hold",
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
      await applyAndLog(supabase, waitlist_id, update, {
        estateId: j.estate_id,
        waitlistId: waitlist_id,
        eventType: "state_change",
        from: j.pipeline_state,
        to: "active",
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
      await applyAndLog(supabase, waitlist_id, update, {
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
      if (body.advisor_id !== undefined) update.nominated_advisor_id = body.advisor_id || null;
      if (body.conditional_amount !== undefined)
        update.finance_conditional_amount =
          body.conditional_amount === "" || body.conditional_amount == null
            ? null
            : Number(body.conditional_amount);
      if (body.advisor_id) update.finance_referred_at = new Date().toISOString();
      await applyAndLog(supabase, waitlist_id, update, {
        estateId: j.estate_id,
        waitlistId: waitlist_id,
        eventType: "finance",
        from: j.finance_status,
        to: finance_status,
        note: body.note ? String(body.note) : null,
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
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

async function applyAndLog(
  supabase: ReturnType<typeof createSupabaseService>,
  waitlistId: string,
  update: Record<string, unknown>,
  event: Parameters<typeof logPipelineEvent>[1],
) {
  const { error } = await (supabase.from("waitlist_registrations") as any)
    .update(update)
    .eq("id", waitlistId);
  if (error) {
    console.error("pipeline update error:", error);
    throw new Error("update failed");
  }
  await logPipelineEvent(supabase, event);
}
