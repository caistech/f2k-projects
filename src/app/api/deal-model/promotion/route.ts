import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase-service";
import { verifyPromotionSignature } from "@/lib/deal-model/promotion-auth";

export const dynamic = "force-dynamic";

/**
 * Cross-repo promotion receiver: DealFindrs -> F2K-Projects.
 *
 * DealFindrs POSTs the immutable deal-model snapshot here when a deal reaches a non-STOP verdict.
 * Security: HMAC over the raw body against DEAL_MODEL_PROMOTION_SECRET, fail-closed (unset -> 500,
 * bad signature -> 401), matching the convai-webhook discipline. Service-role write; RLS
 * deny-by-default. Idempotent on (deal_id, snapshot_version) — re-POSTs update, never duplicate.
 *
 * The receiver only RECORDS the promotion. Whether an estate may be BUILT is decided later by the
 * gate (verdict != REJECT AND title present) — see src/lib/deal-model/gate.ts. This endpoint never
 * clears a build itself.
 *
 * Body:
 *   { dealId, snapshotVersion, grade, verdict, developerThin, baseRatePerLot, netUpliftPct,
 *     stageUsed, snapshot, link?: { email?, estateName? } }
 */
interface PromotionPayload {
  dealId?: string;
  snapshotVersion?: number;
  grade?: string;
  verdict?: string;
  developerThin?: boolean;
  baseRatePerLot?: number;
  netUpliftPct?: number;
  stageUsed?: string;
  snapshot?: unknown;
  link?: { email?: string; estateName?: string };
}

const VALID_VERDICTS = new Set(["GO", "ADJUST", "REJECT"]);

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-deal-model-signature");
  const secret = process.env.DEAL_MODEL_PROMOTION_SECRET;

  if (!secret) {
    console.error("deal-model promotion: DEAL_MODEL_PROMOTION_SECRET is not set");
    return NextResponse.json({ error: "Promotion endpoint not configured" }, { status: 500 });
  }
  if (!verifyPromotionSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: PromotionPayload;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const { dealId, snapshotVersion, verdict, snapshot } = body;
  if (
    !dealId ||
    typeof snapshotVersion !== "number" ||
    !verdict ||
    !VALID_VERDICTS.has(verdict) ||
    snapshot == null
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const supabase = createSupabaseService();

  // Best-effort link to a local intake (by explicit deal_id, else by estate name + email).
  let onboardingId: string | null = null;
  {
    const byDeal = await supabase
      .from("developer_onboarding")
      .select("id")
      .eq("deal_id", dealId)
      .limit(1)
      .maybeSingle();
    if (byDeal.data?.id) {
      onboardingId = byDeal.data.id;
    } else if (body.link?.email) {
      const match = supabase
        .from("developer_onboarding")
        .select("id")
        .eq("email", body.link.email);
      const scoped = body.link.estateName
        ? match.eq("estate_name", body.link.estateName)
        : match;
      const found = await scoped.order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (found.data?.id) {
        onboardingId = found.data.id;
        // stamp the reverse link so future promotions resolve by deal_id directly.
        await supabase.from("developer_onboarding").update({ deal_id: dealId }).eq("id", onboardingId);
      }
    }
  }

  const { error } = await supabase.from("deal_promotions").upsert(
    {
      deal_id: dealId,
      snapshot_version: snapshotVersion,
      grade: body.grade ?? "indicative",
      verdict,
      developer_thin: body.developerThin ?? false,
      base_rate_per_lot: body.baseRatePerLot ?? null,
      net_uplift_pct: body.netUpliftPct ?? null,
      stage_used: body.stageUsed ?? null,
      snapshot,
      onboarding_id: onboardingId,
      source: "dealfindrs",
      received_at: new Date().toISOString(),
    },
    { onConflict: "deal_id,snapshot_version" },
  );

  if (error) {
    console.error("deal-model promotion: upsert failed:", error.message);
    return NextResponse.json({ error: "Persist failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, linked: onboardingId != null });
}
