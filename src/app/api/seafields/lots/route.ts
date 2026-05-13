import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase-service";

export async function GET() {
  const supabase = createSupabaseService();

  try {
    const { data, error } = await (supabase
      .from("seafields_registrations") as any)
      .select("lots_selected");

    if (error) {
      // Table may not exist yet — return empty counts gracefully
      return NextResponse.json({ counts: {} });
    }

    // Aggregate registration count per lot
    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const lots: string[] = row.lots_selected || [];
      for (const lotId of lots) {
        counts[lotId] = (counts[lotId] || 0) + 1;
      }
    }

    return NextResponse.json({ counts });
  } catch {
    return NextResponse.json({ counts: {} });
  }
}
