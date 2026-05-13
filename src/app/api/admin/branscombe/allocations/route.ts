import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_branscombe_allocations")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseService();
  const { data, error } = await (supabase.from("branscombe_unit_allocations") as any)
    .select(
      "unit_number, home_type, area_m2, allocated_to, dwelling_type, notes, wholesale_price, retail_price, intent_locked_to_registration_id, intent_locked_at, intent_locked_by, assigned_at, updated_at",
    )
    .order("unit_number");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ allocations: data || [] });
}
