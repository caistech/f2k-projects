import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import {
  createSupabaseService,
  createSupabaseServiceWithActor,
} from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

const ALLOWED_STATES = new Set(["QLD","NSW","VIC","TAS","SA","WA","NT","ACT"]);
const ALLOWED_STATUSES = new Set([
  "researched","outreach_sent","in_conversation","committed","declined","paused",
]);
const ALLOWED_SOURCES = new Set(["workbook","llm_research","manual","inbound"]);

export async function GET() {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_hemp_homes_prospects")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseService();
  const { data, error } = await (supabase
    .from("hemp_homes_community_prospects_revenue") as any)
    .select("*")
    .order("wave", { ascending: true, nullsFirst: false })
    .order("indicative_lot_potential", { ascending: false, nullsFirst: false })
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ prospects: data ?? [] });
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

export async function POST(request: Request) {
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

  const name = String(body.name ?? "").trim();
  const state = body.state ? String(body.state).trim().toUpperCase() : null;
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name is required (min 2 chars)" }, { status: 400 });
  }
  if (state && !ALLOWED_STATES.has(state)) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }
  const status = body.status ? String(body.status) : "researched";
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const source = body.source ? String(body.source) : "manual";
  if (!ALLOWED_SOURCES.has(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }
  const wave = body.wave != null ? Number(body.wave) : null;
  if (wave != null && ![1, 2, 3].includes(wave)) {
    return NextResponse.json({ error: "Invalid wave (1, 2, or 3)" }, { status: 400 });
  }

  const slug = `${slugify(name)}-${(state ?? "").toLowerCase()}`;

  const supabase = createSupabaseServiceWithActor(admin.email, "create hemp-homes prospect");
  const { data, error } = await (supabase.from("hemp_homes_community_prospects") as any)
    .insert({
      name,
      slug,
      location: body.location ?? null,
      region: body.region ?? body.location ?? null,
      state,
      wave,
      status,
      website_url: body.website_url ?? null,
      land_size_acres: body.land_size_acres ?? null,
      current_members: body.current_members ?? null,
      indicative_lot_potential: body.indicative_lot_potential ?? null,
      source,
      source_basis: body.source_basis ?? null,
      source_url: body.source_url ?? body.website_url ?? null,
      is_public_safe: !!body.is_public_safe,
      notes: body.notes ?? null,
      added_by: admin.auth_user_id,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A prospect with that name + state already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ prospect: data }, { status: 201 });
}
