import { NextResponse } from "next/server";
import { getAdminUser, hasPermission, auditLog } from "@/lib/admin-auth";
import { createSupabaseService, createSupabaseServiceWithActor } from "@/lib/supabase-service";
import { canBuildEstate, hasTitleEvidence, type GateVerdict } from "@/lib/deal-model/gate";

/**
 * Admin clear-for-build gate for a developer-onboarding intake.
 *
 * The enforced green light for building an estate page: an estate can only be cleared when a
 * deal-model promotion has been received with verdict != REJECT AND the developer's title is
 * present. This is enforcement, not advice — POST refuses (409) when the gate fails and never
 * stamps `cleared_for_build_at` unless `canBuildEstate` returns ok.
 *
 * GET  ?onboardingId=… → returns the current gate status (for the admin UI).
 * POST { onboardingId }  → clears for build if the gate passes; otherwise 409 with the reason.
 */

async function resolve(onboardingId: string) {
  const service = createSupabaseService();

  const { data: onboarding, error: onbErr } = await service
    .from("developer_onboarding")
    .select("id, estate_name, email, site_control, uploads, deal_id, cleared_for_build_at, cleared_for_build_by")
    .eq("id", onboardingId)
    .maybeSingle();
  if (onbErr) return { error: `onboarding_lookup_failed: ${onbErr.message}` as const };
  if (!onboarding) return { error: "onboarding_not_found" as const };

  // Latest promotion for this intake — by explicit link, else by the shared deal_id.
  let promo: { verdict: string; snapshot_version: number; deal_id: string; grade: string } | null = null;
  const byOnb = await service
    .from("deal_promotions")
    .select("verdict, snapshot_version, deal_id, grade")
    .eq("onboarding_id", onboardingId)
    .order("snapshot_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  promo = byOnb.data ?? null;
  if (!promo && onboarding.deal_id) {
    const byDeal = await service
      .from("deal_promotions")
      .select("verdict, snapshot_version, deal_id, grade")
      .eq("deal_id", onboarding.deal_id)
      .order("snapshot_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    promo = byDeal.data ?? null;
  }

  const titlePresent = hasTitleEvidence(onboarding);
  const gate = canBuildEstate({
    verdict: (promo?.verdict ?? null) as GateVerdict | null,
    titlePresent,
  });

  return { onboarding, promo, titlePresent, gate };
}

export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_developer_onboarding")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const onboardingId = new URL(request.url).searchParams.get("onboardingId");
  if (!onboardingId) return NextResponse.json({ error: "onboardingId required" }, { status: 400 });

  const r = await resolve(onboardingId);
  if ("error" in r) {
    const status = r.error === "onboarding_not_found" ? 404 : 500;
    return NextResponse.json({ error: r.error }, { status });
  }
  return NextResponse.json({
    verdict: r.promo?.verdict ?? null,
    snapshotVersion: r.promo?.snapshot_version ?? null,
    grade: r.promo?.grade ?? null,
    titlePresent: r.titlePresent,
    gate: r.gate,
    clearedForBuildAt: r.onboarding.cleared_for_build_at,
    clearedForBuildBy: r.onboarding.cleared_for_build_by,
  });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_developer_onboarding")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const onboardingId = String(body.onboardingId || "").trim();
  if (!onboardingId) return NextResponse.json({ error: "onboardingId required" }, { status: 400 });

  const r = await resolve(onboardingId);
  if ("error" in r) {
    const status = r.error === "onboarding_not_found" ? 404 : 500;
    return NextResponse.json({ error: r.error }, { status });
  }

  // ENFORCEMENT: never clear a build unless the gate passes.
  if (!r.gate.ok) {
    return NextResponse.json({ error: "gate_blocked", reason: r.gate.reason }, { status: 409 });
  }

  const service = createSupabaseServiceWithActor(admin.email, `Cleared for build (verdict ${r.promo?.verdict})`);
  const nowIso = new Date().toISOString();
  const { error } = await service
    .from("developer_onboarding")
    .update({
      cleared_for_build_at: nowIso,
      cleared_for_build_by: admin.email,
      // link the intake to its deal so future lookups resolve directly.
      ...(r.promo?.deal_id && !r.onboarding.deal_id ? { deal_id: r.promo.deal_id } : {}),
    })
    .eq("id", onboardingId);
  if (error) {
    console.error("clear-for-build update failed:", error.message);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  await auditLog(admin.id, admin.email, "clear_for_build", "developer_onboarding", onboardingId, {
    verdict: r.promo?.verdict,
    snapshot_version: r.promo?.snapshot_version,
    grade: r.promo?.grade,
  });

  return NextResponse.json({ ok: true, clearedForBuildAt: nowIso, reason: r.gate.reason });
}
