import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";
export const revalidate = 60;

/**
 * Public lot pricing for the Branscombe site map. Returns the retail
 * ("suggested") price per unit so the plan-view info card can render
 * "Suggested price from $X". Only retail_price is exposed — wholesale_price
 * and every other admin column stay server-side and are never selected here.
 *
 * Response keyed by unit_number for O(1) client lookup:
 *   { lots: BranscombeLotRow[] }
 */
export type BranscombeLotRow = {
  unit_number: number;
  retail_price: number | null;
};

export async function GET() {
  const supabase = createSupabaseService();

  try {
    const { data, error } = await (
      supabase.from("branscombe_unit_allocations") as any
    )
      .select("unit_number, retail_price")
      .order("unit_number");

    if (error) {
      return NextResponse.json({ lots: [] });
    }

    return NextResponse.json({ lots: (data || []) as BranscombeLotRow[] });
  } catch {
    return NextResponse.json({ lots: [] });
  }
}
