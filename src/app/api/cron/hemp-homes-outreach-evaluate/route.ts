/**
 * Daily evaluator for hemp-homes prospect outreach. Triggered by Vercel
 * cron once a day. For each active template, finds matching prospects per
 * the template's trigger_type + trigger_config, applies gates (privacy,
 * contact_emails present, 21-day frequency cap, never-before-fired for
 * stage_transition triggers), and generates drafts via the same
 * generator the manual /generate route uses. Drafts always land in
 * review_status='pending' for human approval — auto_send is a future
 * lever (Phase 2).
 *
 * Cron auth: Vercel sends Authorization: Bearer <CRON_SECRET>. Local
 * dev (no CRON_SECRET set) bypasses the check.
 */

import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase-service";
import { generateOutreachDraft } from "@/lib/hemp-homes/outreach-generator";
import type {
  HempHomesOutreachTemplate,
  HempHomesProspect,
} from "@/lib/hemp-homes/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const FREQUENCY_CAP_DAYS = 21;
const MAX_DRAFTS_PER_RUN = 25; // safety cap — keeps runs under maxDuration + bounds LLM cost

function authorised(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // No secret configured = local dev. Refuse only on Vercel.
    return !process.env.VERCEL;
  }
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${expected}`;
}

interface EvalResult {
  template: string;
  prospect: string;
  outcome: "queued" | "skipped" | "error";
  reason?: string;
  draft_id?: string;
}

interface SkipCounts {
  paused_or_declined: number;
  no_contact: number;
  frequency_cap: number;
  stage_already_fired: number;
  time_gap_not_reached: number;
  no_match: number;
  cap_hit: number;
}

export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseService();
  const startedAt = new Date().toISOString();
  const results: EvalResult[] = [];
  const skips: SkipCounts = {
    paused_or_declined: 0,
    no_contact: 0,
    frequency_cap: 0,
    stage_already_fired: 0,
    time_gap_not_reached: 0,
    no_match: 0,
    cap_hit: 0,
  };
  let drafted = 0;

  // Load active, non-manual templates.
  const { data: templates, error: tplErr } = await (supabase
    .from("hemp_homes_outreach_templates") as any)
    .select("*")
    .eq("active", true)
    .neq("trigger_type", "manual");
  if (tplErr) {
    return NextResponse.json({ error: tplErr.message }, { status: 500 });
  }

  // Load all prospects once (we filter per template in-memory — 39+ prospects
  // is well within a single fetch and avoids N queries per template).
  const { data: prospects, error: pErr } = await (supabase
    .from("hemp_homes_community_prospects") as any)
    .select("*");
  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const sinceFreqCap = new Date(Date.now() - FREQUENCY_CAP_DAYS * 86400_000).toISOString();

  for (const t of (templates ?? []) as HempHomesOutreachTemplate[]) {
    for (const p of (prospects ?? []) as HempHomesProspect[]) {
      if (drafted >= MAX_DRAFTS_PER_RUN) {
        skips.cap_hit++;
        continue;
      }

      // ── Target predicates ───────────────────────────────────────────────
      if (t.target_waves && (!p.wave || !t.target_waves.includes(p.wave))) {
        skips.no_match++; continue;
      }
      if (t.target_statuses && !t.target_statuses.includes(p.status)) {
        skips.no_match++; continue;
      }
      if (t.target_states && (!p.state || !t.target_states.includes(p.state))) {
        skips.no_match++; continue;
      }

      // ── Privacy + lifecycle gates ───────────────────────────────────────
      if (["paused", "declined"].includes(p.outreach_status as string)) {
        skips.paused_or_declined++; continue;
      }
      if ((p.contact_emails ?? []).length === 0) {
        skips.no_contact++; continue;
      }

      // ── Frequency cap (same template, same prospect, last 21 days) ─────
      // Intentionally per-template so an intro + its 14-day follow-up
      // (different templates) can fire inside the same 21-day window.
      // Same-template repeats are blocked.
      const { data: recent } = await (supabase.from("hemp_homes_prospect_outreach") as any)
        .select("id, generated_at, review_status")
        .eq("prospect_id", p.id)
        .eq("template_id", t.id)
        .gte("generated_at", sinceFreqCap)
        .in("review_status", ["pending", "approved"])
        .limit(1);
      if ((recent ?? []).length > 0) {
        skips.frequency_cap++; continue;
      }

      // ── Trigger-specific gates ──────────────────────────────────────────
      // The target_statuses predicate above has already filtered prospects
      // to the right status for both stage_transition + time_gap. The
      // trigger-specific logic below only handles idempotency + time gating.
      if (t.trigger_type === "stage_transition") {
        // Fire once per (template, prospect) when prospect entered the
        // target status. Idempotent: skip if any prior draft exists at all.
        const { data: prior } = await (supabase.from("hemp_homes_prospect_outreach") as any)
          .select("id")
          .eq("prospect_id", p.id)
          .eq("template_id", t.id)
          .limit(1);
        if ((prior ?? []).length > 0) {
          skips.stage_already_fired++; continue;
        }
      } else if (t.trigger_type === "time_gap") {
        // Config: { days }. Fire when prospect.last_outreach_at is at least
        // `days` ago. Re-firing window enforced by checking no draft for
        // (template, prospect) within the last `days`.
        const cfg = t.trigger_config as { days?: number };
        if (cfg.days == null) {
          skips.no_match++; continue;
        }
        if (!p.last_outreach_at) {
          skips.time_gap_not_reached++; continue;
        }
        const elapsedMs = Date.now() - new Date(p.last_outreach_at).getTime();
        if (elapsedMs < cfg.days * 86400_000) {
          skips.time_gap_not_reached++; continue;
        }
        const sinceGap = new Date(Date.now() - cfg.days * 86400_000).toISOString();
        const { data: priorGap } = await (supabase.from("hemp_homes_prospect_outreach") as any)
          .select("id")
          .eq("prospect_id", p.id)
          .eq("template_id", t.id)
          .gte("generated_at", sinceGap)
          .limit(1);
        if ((priorGap ?? []).length > 0) {
          skips.stage_already_fired++; continue;
        }
      }

      // ── Generate ─────────────────────────────────────────────────────────
      try {
        const draft = await generateOutreachDraft(t, p);
        const { data: row, error: insErr } = await (supabase
          .from("hemp_homes_prospect_outreach") as any)
          .insert({
            prospect_id: p.id,
            template_id: t.id,
            drafted_subject: draft.subject,
            drafted_preview: draft.preview,
            drafted_body_md: draft.body_md,
            drafted_body_html: draft.body_html,
            drafted_to_addresses: p.contact_emails ?? [],
            review_status: "pending",
          })
          .select("id")
          .single();
        if (insErr) {
          results.push({ template: t.slug, prospect: p.slug, outcome: "error", reason: insErr.message });
          continue;
        }

        if (p.outreach_status === "idle") {
          await (supabase.from("hemp_homes_community_prospects") as any)
            .update({ outreach_status: "queued" })
            .eq("id", p.id);
        }

        drafted++;
        results.push({ template: t.slug, prospect: p.slug, outcome: "queued", draft_id: row.id });
      } catch (e) {
        results.push({ template: t.slug, prospect: p.slug, outcome: "error", reason: (e as Error).message });
      }
    }
  }

  return NextResponse.json({
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    templates_evaluated: templates?.length ?? 0,
    prospects_evaluated: prospects?.length ?? 0,
    drafts_queued: drafted,
    skipped: skips,
    results,
  });
}
