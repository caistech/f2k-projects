import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

/**
 * Returns all seafields_registrations whose lots_selected array contains the
 * given lotId, plus a summary of the lot's current allocation/intent-lock
 * state. Used by the admin click-to-edit panel to show "who's waiting on
 * this lot" and to power the lock/convert workflow.
 */
export async function GET(
  _req: Request,
  { params }: { params: { lotId: string } }
) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_seafields_allocations")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const lotId = String(params.lotId).trim();
  if (!lotId) {
    return NextResponse.json({ error: "lotId required" }, { status: 400 });
  }

  const supabase = createSupabaseService();

  // Registrations whose lots_selected array contains this lotId
  const { data: registrations, error: regErr } = await (
    supabase.from("seafields_registrations") as any
  )
    .select(
      "id, first_name, last_name, email, phone, suburb, postcode, interest_type, buyer_type, buyer_profile, purchase_timeline, finance_status, lots_selected, price_preferences, dwelling_preferences, referrer_type, referrer_name, referrer_company, agent_id, source, notes, created_at"
    )
    .contains("lots_selected", [lotId])
    .order("created_at", { ascending: false });

  if (regErr) {
    return NextResponse.json({ error: regErr.message }, { status: 500 });
  }

  // F2KSFLDS-22: resolve the lead source for each registrant so the waitlist
  // can show where the lead came from — the linked referring agent (e.g.
  // "Henry") or the source channel (e.g. web-roi → "Web"). Regression fix:
  // this displayed before the V6 schema re-wire and was dropped.
  const regList = (registrations || []) as Array<Record<string, unknown>>;
  const agentIds = Array.from(
    new Set(regList.map((r) => r.agent_id).filter(Boolean) as string[]),
  );
  const agentNameById = new Map<string, string>();
  if (agentIds.length > 0) {
    const { data: agentRows } = await (supabase.from("agents") as any)
      .select("id, name")
      .in("id", agentIds);
    for (const a of (agentRows as Array<{ id: string; name: string }>) || []) {
      agentNameById.set(a.id, a.name);
    }
  }
  const registrationsWithSource = regList.map((r) => ({
    ...r,
    agent_name: r.agent_id
      ? agentNameById.get(r.agent_id as string) ?? null
      : null,
  }));

  // Current allocation state for the lot — extract numeric lot number from lotId
  const lotNoMatch = lotId.match(/^L(\d+)/);
  const lotNumber = lotNoMatch ? Number(lotNoMatch[1]) : null;

  let allocation: Record<string, unknown> | null = null;
  if (lotNumber !== null) {
    const { data, error } = await (
      supabase.from("seafields_lot_allocations") as any
    )
      .select(
        "lot_number, sqm, allocated_to, dwelling_type, stage, notes, wholesale_price, retail_price, intent_locked_to_registration_id, intent_locked_at, intent_locked_by, assigned_at, updated_at"
      )
      .eq("lot_number", lotNumber)
      .maybeSingle();
    if (!error && data) {
      allocation = data;
    }
  }

  return NextResponse.json({
    lotId,
    lotNumber,
    allocation,
    registrations: registrationsWithSource,
    counts: {
      registrations: regList.length,
      hasAllocation: !!allocation?.allocated_to,
      hasIntentLock: !!allocation?.intent_locked_to_registration_id,
    },
  });
}
