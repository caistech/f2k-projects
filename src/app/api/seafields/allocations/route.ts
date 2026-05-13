import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  const supabase = createSupabaseService();

  try {
    const { data, error } = await (supabase.from("seafields_lot_allocations") as any)
      .select("lot_number, allocated_to, dwelling_type, stage")
      .not("allocated_to", "is", null)
      .order("lot_number");

    if (error) {
      return NextResponse.json({ allocations: [] });
    }

    return NextResponse.json({ allocations: data || [] });
  } catch {
    return NextResponse.json({ allocations: [] });
  }
}
