import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

const ADVISOR_TYPES = ["mortgage_broker", "financial_advisor"];

// PATCH — edit an advisor (fields incl. active). Spec: docs/estate-buyer-pipeline-design.md §4.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    update.name = name;
  }
  if (body.type !== undefined) {
    if (!ADVISOR_TYPES.includes(String(body.type))) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    update.type = body.type;
  }
  if (body.firm !== undefined) update.firm = body.firm ? String(body.firm).trim() : null;
  if (body.email !== undefined) update.email = body.email ? String(body.email).trim() : null;
  if (body.phone !== undefined) update.phone = body.phone ? String(body.phone).trim() : null;
  if (body.notes !== undefined) update.notes = body.notes ? String(body.notes).trim() : null;
  if (body.active !== undefined) update.active = !!body.active;

  const supabase = createSupabaseService();
  const { error } = await (supabase.from("advisors") as any).update(update).eq("id", params.id);
  if (error) {
    console.error("advisor update error:", error);
    return NextResponse.json({ error: "Failed to update advisor" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE — remove an advisor. The waitlist_registrations.nominated_advisor_id FK is ON DELETE SET
// NULL, so past nominations keep their pipeline_events history; only the live link is cleared.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = createSupabaseService();
  const { error } = await (supabase.from("advisors") as any).delete().eq("id", params.id);
  if (error) {
    console.error("advisor delete error:", error);
    return NextResponse.json({ error: "Failed to delete advisor" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
