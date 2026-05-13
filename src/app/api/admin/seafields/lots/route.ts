import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

/**
 * Per-lot registration counts. Mirrors investor-portal's /api/seafields/lots,
 * but gated by admin auth + manage_seafields_allocations so the pipeline page
 * stays consistent with the allocations endpoint it pairs with.
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_seafields_allocations")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseService();
  const { data, error } = await (
    supabase.from("seafields_registrations") as any
  ).select("lots_selected");

  if (error) {
    return NextResponse.json({ counts: {} });
  }

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    const lots: string[] = row.lots_selected || [];
    for (const lotId of lots) {
      counts[lotId] = (counts[lotId] || 0) + 1;
    }
  }

  return NextResponse.json({ counts });
}
