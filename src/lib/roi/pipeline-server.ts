// Server-only helpers for writing the append-only pipeline_events log + advancing the journey.
// Keep this OUT of client bundles (imports the service client). Spec: docs/estate-buyer-pipeline-design.md.

import { createSupabaseService } from "@/lib/supabase-service";

type Service = ReturnType<typeof createSupabaseService>;

export type Actor = {
  type: "agent" | "admin" | "system" | "buyer";
  id?: string | null;
  email?: string | null;
};

export type PipelineEventInput = {
  estateId?: string | null;
  waitlistId: string;
  eventType: "stage_change" | "state_change" | "milestone" | "finance" | "note";
  from?: string | null;
  to?: string | null;
  reasonCode?: string | null;
  note?: string | null;
  actor: Actor;
};

/**
 * Append one row to pipeline_events. Best-effort by design: a logging failure must never block the
 * underlying state change (the change is the source of truth; the event is the audit trail). Errors
 * are logged, not thrown.
 */
export async function logPipelineEvent(
  supabase: Service,
  e: PipelineEventInput,
): Promise<void> {
  try {
    const { error } = await (supabase.from("pipeline_events") as any).insert({
      estate_id: e.estateId ?? null,
      waitlist_id: e.waitlistId,
      event_type: e.eventType,
      from_value: e.from ?? null,
      to_value: e.to ?? null,
      reason_code: e.reasonCode ?? null,
      note: e.note ?? null,
      actor_type: e.actor.type,
      actor_id: e.actor.id ?? null,
      actor_email: e.actor.email ?? null,
    });
    if (error) console.error("pipeline_events insert error:", error);
  } catch (err) {
    console.error("logPipelineEvent threw:", err);
  }
}

/** Load the minimal journey row needed to apply + log a change. */
export async function loadJourney(
  supabase: Service,
  waitlistId: string,
): Promise<{
  id: string;
  estate_id: string;
  pipeline_stage: string;
  pipeline_state: string;
  finance_status: string;
  introducing_agent_id: string | null;
} | null> {
  const { data } = await (supabase.from("waitlist_registrations") as any)
    .select("id, estate_id, pipeline_stage, pipeline_state, finance_status, introducing_agent_id")
    .eq("id", waitlistId)
    .maybeSingle();
  return data ?? null;
}
