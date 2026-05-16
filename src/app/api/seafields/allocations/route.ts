import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export type PublicLotRow = {
  lot_number: number;
  status: string;
  allocation_bucket: string | null;
  public_label: string | null;
  stage_number: number | null;
  stage_label: string | null;
  is_open_for_registration: boolean;
  effective_rate_per_sqm: number | null;
  land_total: number | null;
  total_price: number | null;
  land_only: boolean;
};

/**
 * Public lot register. Reads the seafields_public_lots view — never the
 * base allocations table — so admin-only columns (allocated_to, wholesale
 * price, internal notes, intent-lock metadata) cannot leak to anon. The
 * view also suppresses prices when display_price_to_public=FALSE or the
 * stage is hidden, and filters out non-public stages entirely.
 *
 * Response is keyed by lot_number for O(1) lookup in the client.
 * F2KSFLDS-8: replaces the previous /api/seafields/allocations endpoint
 * which returned the raw allocated_to free-text field.
 */
export async function GET() {
  const supabase = createSupabaseService();

  try {
    const { data, error } = await (supabase
      .from("seafields_public_lots") as any)
      .select(
        "lot_number, status, allocation_bucket, public_label, stage_number, stage_label, is_open_for_registration, effective_rate_per_sqm, land_total, total_price, land_only",
      )
      .order("lot_number");

    if (error) {
      return NextResponse.json({ lots: [] });
    }

    return NextResponse.json({ lots: (data || []) as PublicLotRow[] });
  } catch {
    return NextResponse.json({ lots: [] });
  }
}
