import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseServiceWithActor } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

const ALLOWED_STATES = new Set(["QLD","NSW","VIC","TAS","SA","WA","NT","ACT"]);
const ALLOWED_STATUSES = new Set([
  "researched","outreach_sent","in_conversation","committed","declined","paused",
]);

interface RouteCtx { params: { id: string } }

export async function PATCH(request: Request, { params }: RouteCtx) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_hemp_homes_prospects")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  const allowedTextFields = [
    "name","location","region","website_url","source_basis","source_url","notes","next_action",
    "contact_form_url","contact_phone","contact_discovery_notes",
  ];
  for (const f of allowedTextFields) {
    if (f in body) update[f] = body[f] === "" ? null : body[f];
  }
  if ("contact_emails" in body) {
    if (!Array.isArray(body.contact_emails)) {
      return NextResponse.json({ error: "contact_emails must be an array" }, { status: 400 });
    }
    // Trim + drop empties; validate basic shape (foo@bar).
    const cleaned: string[] = [];
    for (const e of body.contact_emails) {
      const s = String(e ?? "").trim();
      if (!s) continue;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
        return NextResponse.json({ error: `Invalid email: ${s}` }, { status: 400 });
      }
      cleaned.push(s);
    }
    update.contact_emails = cleaned;
  }

  if ("state" in body) {
    const s = body.state ? String(body.state).toUpperCase() : null;
    if (s && !ALLOWED_STATES.has(s)) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }
    update.state = s;
  }
  if ("status" in body) {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }
  if ("wave" in body) {
    if (body.wave != null && ![1, 2, 3].includes(Number(body.wave))) {
      return NextResponse.json({ error: "Invalid wave" }, { status: 400 });
    }
    update.wave = body.wave == null ? null : Number(body.wave);
  }
  if ("land_size_acres" in body) update.land_size_acres = body.land_size_acres ?? null;
  if ("current_members" in body) update.current_members = body.current_members ?? null;
  if ("indicative_lot_potential" in body) update.indicative_lot_potential = body.indicative_lot_potential ?? null;
  if ("is_public_safe" in body) update.is_public_safe = !!body.is_public_safe;
  if ("last_contacted_at" in body) update.last_contacted_at = body.last_contacted_at ?? null;
  if ("next_action_due" in body) update.next_action_due = body.next_action_due ?? null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields supplied" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" && body.reason.trim()
    ? body.reason.trim()
    : "edit hemp-homes prospect";

  const supabase = createSupabaseServiceWithActor(admin.email, reason);
  const { data, error } = await (supabase.from("hemp_homes_community_prospects") as any)
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ prospect: data });
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_hemp_homes_prospects")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseServiceWithActor(admin.email, "delete hemp-homes prospect");
  const { error } = await (supabase.from("hemp_homes_community_prospects") as any)
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
