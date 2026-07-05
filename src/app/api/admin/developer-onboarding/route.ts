import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";
import { canBuildEstate, hasTitleEvidence, type GateVerdict } from "@/lib/deal-model/gate";
import type { PropertyCheck } from "@/lib/property-check";

/**
 * List developer-onboarding intakes with their deal-model gate status, for the admin
 * clear-for-build view. Each row carries the latest received promotion verdict, whether the
 * title is present, and the computed gate result — so the operator sees at a glance which
 * estates are cleared to build and which are blocked (and why).
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_developer_onboarding")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createSupabaseService();

  const { data: rows, error } = await service
    .from("developer_onboarding")
    .select(
      "id, developer_name, email, estate_name, estate_location, status, site_control, uploads, deal_id, cleared_for_build_at, cleared_for_build_by, created_at, property_check",
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.error("developer-onboarding list failed:", error.message);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  // Pull all promotions once; index the latest (highest version) per onboarding_id and per deal_id.
  const { data: promos } = await service
    .from("deal_promotions")
    .select("deal_id, onboarding_id, verdict, snapshot_version")
    .order("snapshot_version", { ascending: false });

  const byOnb = new Map<string, { verdict: string; snapshot_version: number }>();
  const byDeal = new Map<string, { verdict: string; snapshot_version: number }>();
  for (const p of promos ?? []) {
    if (p.onboarding_id && !byOnb.has(p.onboarding_id)) byOnb.set(p.onboarding_id, p);
    if (p.deal_id && !byDeal.has(p.deal_id)) byDeal.set(p.deal_id, p);
  }

  const onboardings = (rows ?? []).map((r) => {
    const promo = byOnb.get(r.id) ?? (r.deal_id ? byDeal.get(r.deal_id) : undefined) ?? null;
    const titlePresent = hasTitleEvidence(r);
    const gate = canBuildEstate({
      verdict: (promo?.verdict ?? null) as GateVerdict | null,
      titlePresent,
    });
    return {
      id: r.id,
      developerName: r.developer_name,
      estateName: r.estate_name,
      location: r.estate_location,
      status: r.status,
      siteControl: r.site_control,
      createdAt: r.created_at,
      verdict: promo?.verdict ?? null,
      snapshotVersion: promo?.snapshot_version ?? null,
      titlePresent,
      gate,
      clearedForBuildAt: r.cleared_for_build_at,
      clearedForBuildBy: r.cleared_for_build_by,
      propertyCheck: (r.property_check ?? null) as PropertyCheck | null,
    };
  });

  return NextResponse.json({ onboardings });
}
