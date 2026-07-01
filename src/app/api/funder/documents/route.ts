import { NextResponse } from "next/server";
import { requireFunder, allowedTiersFor } from "@/lib/funders/funder-auth";
import { createSupabaseService } from "@/lib/supabase-service";

// GET — the funder's visible documents, filtered to the tiers their NDA/access permits.
export async function GET() {
  const auth = await requireFunder();
  if (auth instanceof NextResponse) return auth;
  const { member } = auth;

  const supabase = createSupabaseService();
  const tiers = allowedTiersFor(member.max_tier);
  const { data, error } = await (supabase.from("funder_documents") as any)
    .select("id, display_name, category, confidentiality_tier, format, file_size, created_at")
    .in("confidentiality_tier", tiers)
    .order("category", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("funder documents list error:", error);
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
  return NextResponse.json({ documents: data ?? [], maxTier: member.max_tier });
}
