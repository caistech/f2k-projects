import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

/**
 * Returns all branscombe_registrations whose units_selected array contains
 * the given unitId, plus a summary of the unit's current allocation /
 * intent-lock state. Powers the admin click-to-edit waitlist panel.
 */
export async function GET(
  _req: Request,
  { params }: { params: { unitId: string } },
) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_branscombe_allocations")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const unitId = String(params.unitId).trim();
  if (!/^U\d{1,2}$/.test(unitId)) {
    return NextResponse.json({ error: "Invalid unit id" }, { status: 400 });
  }

  const supabase = createSupabaseService();

  const { data: registrations, error: regErr } = await (
    supabase.from("branscombe_registrations") as any
  )
    .select(
      "id, first_name, last_name, email, phone, suburb, postcode, buyer_type, buyer_profile, current_housing, purchase_timeline, finance_status, units_selected, price_preferences, referrer_type, referrer_name, referrer_company, notes, created_at",
    )
    .contains("units_selected", [unitId])
    .order("created_at", { ascending: false });

  if (regErr) {
    return NextResponse.json({ error: regErr.message }, { status: 500 });
  }

  const unitNumber = Number(unitId.slice(1));
  let allocation: Record<string, unknown> | null = null;
  if (Number.isInteger(unitNumber) && unitNumber >= 1 && unitNumber <= 37) {
    const { data, error } = await (
      supabase.from("branscombe_unit_allocations") as any
    )
      .select(
        "unit_number, home_type, area_m2, allocated_to, dwelling_type, notes, wholesale_price, retail_price, intent_locked_to_registration_id, intent_locked_at, intent_locked_by, assigned_at, updated_at",
      )
      .eq("unit_number", unitNumber)
      .maybeSingle();
    if (!error && data) {
      allocation = data;
    }
  }

  return NextResponse.json({
    unitId,
    unitNumber,
    allocation,
    registrations: registrations || [],
    counts: {
      registrations: (registrations || []).length,
      hasAllocation: !!allocation?.allocated_to,
      hasIntentLock: !!allocation?.intent_locked_to_registration_id,
    },
  });
}
