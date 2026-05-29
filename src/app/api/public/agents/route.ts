import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const service = createSupabaseService();
  
  const { data, error } = await (service.from("agents") as any)
    .select("id, name, email, agency, estate_access")
    .eq("active", true)
    .eq("status", "active")
    .order("name", { ascending: true });
    
  if (error) {
    console.error("public agents list error:", error);
    return NextResponse.json({ agents: [] });
  }
  
  return NextResponse.json({ agents: data ?? [] });
}
