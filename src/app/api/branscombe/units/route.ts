import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase-service";
import { UNITS } from "@/lib/branscombe-units";

export const revalidate = 0; // no cache — always fresh counts

export async function GET() {
  const supabase = createSupabaseService();

  // Fetch all registrations and count per unit
  const { data, error } = await (supabase.from("branscombe_registrations") as any)
    .select("units_selected");

  if (error) {
    // If table doesn't exist yet, return zero counts
    const zeroCounts: Record<string, number> = {};
    for (const u of UNITS) zeroCounts[u.id] = 0;
    return NextResponse.json({ counts: zeroCounts });
  }

  const counts: Record<string, number> = {};
  for (const u of UNITS) counts[u.id] = 0;

  for (const row of data || []) {
    const units: string[] = row.units_selected || [];
    for (const uid of units) {
      if (counts[uid] !== undefined) {
        counts[uid]++;
      }
    }
  }

  return NextResponse.json({ counts });
}
