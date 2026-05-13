import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";
export const revalidate = 60;

/**
 * Public-read endpoint: returns only firmly-allocated units (allocated_to set).
 * Used by the public site map to render Reserved status. Pricing,
 * intent-lock, notes etc. are admin-only and stripped here.
 */
export async function GET() {
  const supabase = createSupabaseService();

  try {
    const { data, error } = await (
      supabase.from("branscombe_unit_allocations") as any
    )
      .select("unit_number, allocated_to, dwelling_type, home_type")
      .not("allocated_to", "is", null)
      .order("unit_number");

    if (error) {
      return NextResponse.json({ allocations: [] });
    }

    return NextResponse.json({ allocations: data || [] });
  } catch {
    return NextResponse.json({ allocations: [] });
  }
}
