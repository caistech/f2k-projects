import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import {
  createSupabaseService,
  createSupabaseServiceWithActor,
} from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_hemp_homes_prospects")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = createSupabaseService();
  const { data, error } = await (supabase.from("hemp_homes_pricing_assumptions") as any)
    .select("*")
    .eq("id", "singleton")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assumptions: data });
}

export async function PATCH(request: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_hemp_homes_pricing")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const update: Record<string, number> = {};
  for (const key of ["price_low", "price_mid", "price_high"]) {
    if (key in body) {
      const n = Number(body[key]);
      if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 });
      update[key] = n;
    }
  }
  for (const key of ["capture_conservative", "capture_base", "capture_optimistic"]) {
    if (key in body) {
      const n = Number(body[key]);
      if (!Number.isFinite(n) || n < 0 || n > 1) {
        return NextResponse.json({ error: `Invalid ${key} (0..1)` }, { status: 400 });
      }
      update[key] = n;
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createSupabaseServiceWithActor(admin.email, "update hemp-homes pricing assumptions");
  const { data, error } = await (supabase.from("hemp_homes_pricing_assumptions") as any)
    .update(update)
    .eq("id", "singleton")
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assumptions: data });
}
