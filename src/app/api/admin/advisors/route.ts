import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

const ADVISOR_TYPES = ["mortgage_broker", "financial_advisor"];

// GET — the broker/advisor directory (finance gate). Optional ?active=1 to list only active ones
// (the nomination dropdown uses that). Spec: docs/estate-buyer-pipeline-design.md §4.
export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const supabase = createSupabaseService();
  let query = (supabase.from("advisors") as any)
    .select("id, name, firm, type, email, phone, active, notes, created_at")
    .order("name", { ascending: true });
  if (searchParams.get("active") === "1") query = query.eq("active", true);

  const { data, error } = await query;
  if (error) {
    console.error("advisors list error:", error);
    return NextResponse.json({ error: "Failed to load advisors" }, { status: 500 });
  }
  return NextResponse.json({ advisors: data ?? [] });
}

// POST — create an advisor.
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const type = String(body.type || "mortgage_broker");
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!ADVISOR_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const supabase = createSupabaseService();
  const { data, error } = await (supabase.from("advisors") as any)
    .insert({
      name,
      type,
      firm: body.firm ? String(body.firm).trim() : null,
      email: body.email ? String(body.email).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
    })
    .select("id")
    .single();
  if (error) {
    console.error("advisor create error:", error);
    return NextResponse.json({ error: "Failed to create advisor" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
