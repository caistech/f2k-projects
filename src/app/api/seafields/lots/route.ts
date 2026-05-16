import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

/**
 * Public registration heat counts. Reads the seafields_registration_lots
 * join table (one row per registrant × lot) so position-in-queue and
 * status-aware filtering are honoured. F2KSFLDS-8: previously aggregated
 * seafields_registrations.lots_selected[], which double-counted nothing
 * but missed the active/locked-in filter and ignored the backup_list
 * distinction.
 *
 * Response shape kept identical: { counts: Record<"L<n>", number> }.
 */
export async function GET() {
  const supabase = createSupabaseService();

  try {
    const { data, error } = await (supabase
      .from("seafields_registration_lots") as any)
      .select("lot_number")
      .in("status", ["active", "locked_in"])
      .eq("registration_type", "primary");

    if (error) {
      return NextResponse.json({ counts: {} });
    }

    const counts: Record<string, number> = {};
    for (const row of (data || []) as Array<{ lot_number: number }>) {
      const key = `L${row.lot_number}`;
      counts[key] = (counts[key] || 0) + 1;
    }

    return NextResponse.json({ counts });
  } catch {
    return NextResponse.json({ counts: {} });
  }
}
