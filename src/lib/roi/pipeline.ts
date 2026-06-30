// Single source of truth for the estate buyer-journey pipeline model.
// Spec: docs/estate-buyer-pipeline-design.md. The DB stores plain TEXT (no CHECK constraints) so
// stages can be added without a migration; THIS file is the validation + labelling layer.
// Pure module (no server imports) — safe to import from client components.

// ── Backbone (ordered: furthest gate reached) ──────────────────────────────
export const PIPELINE_STAGES = [
  "enquiry",
  "agent_contacted",
  "form_sent",
  "registered",
  "offer",
  "contract_conditional",
  "unconditional",
  "settled",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  enquiry: "Enquiry",
  agent_contacted: "Contacted",
  form_sent: "Form sent",
  registered: "Registered",
  offer: "Offer / allocation",
  contract_conditional: "Contract (conditional)",
  unconditional: "Unconditional",
  settled: "Settled",
};

export const STAGE_HINTS: Record<PipelineStage, string> = {
  enquiry: "Lodged the waitlist (interest only)",
  agent_contacted: "Agent spoke to them and judged them genuine",
  form_sent: "Qualification form emailed",
  registered: "Completed the signed qualification form",
  offer: "A home is held + price agreed in principle",
  contract_conditional: "Contract signed, subject to finance/valuation",
  unconditional: "Conditions satisfied",
  settled: "Settlement complete",
};

// ── State (orthogonal lifecycle) ───────────────────────────────────────────
export const PIPELINE_STATES = ["active", "on_hold", "withdrawn"] as const;
export type PipelineState = (typeof PIPELINE_STATES)[number];
export const STATE_LABELS: Record<PipelineState, string> = {
  active: "Active",
  on_hold: "On hold",
  withdrawn: "Withdrawn",
};

// ── Finance milestone ──────────────────────────────────────────────────────
export const FINANCE_STATUSES = [
  "unknown",
  "cash",
  "preapproved",
  "needs_finance",
  "in_assessment",
  "qualified",
  "declined",
] as const;
export type FinanceStatus = (typeof FINANCE_STATUSES)[number];
export const FINANCE_LABELS: Record<FinanceStatus, string> = {
  unknown: "Unknown",
  cash: "Cash buyer",
  preapproved: "Pre-approved",
  needs_finance: "Needs finance",
  in_assessment: "In assessment",
  qualified: "Finance qualified",
  declined: "Finance declined",
};

// ── Viewed milestone ───────────────────────────────────────────────────────
export const VIEWED_MODES = ["in_person", "guided_remote"] as const;
export type ViewedMode = (typeof VIEWED_MODES)[number];
export const VIEWED_LABELS: Record<ViewedMode, string> = {
  in_person: "Viewed in person",
  guided_remote: "Guided remote walkthrough",
};

// ── Drop-off reasons (fixed picklist; D4) ──────────────────────────────────
export const EXIT_REASONS = [
  { code: "price_too_high", label: "Price / budget too high" },
  { code: "finance_declined", label: "Finance declined / couldn't qualify" },
  { code: "timing", label: "Timing not right" },
  { code: "home_unavailable", label: "Lost the home they wanted" },
  { code: "location_unsuitable", label: "Location / product didn't suit" },
  { code: "chose_competitor", label: "Chose a competitor / different estate" },
  { code: "went_cold", label: "Lost contact / no response" },
  { code: "changed_plans", label: "Changed plans" },
  { code: "other", label: "Other (add a note)" },
] as const;
export type ExitReason = (typeof EXIT_REASONS)[number]["code"];
export const EXIT_REASON_LABELS: Record<string, string> = Object.fromEntries(
  EXIT_REASONS.map((r) => [r.code, r.label]),
);

// ── Helpers ────────────────────────────────────────────────────────────────
export function stageIndex(stage: string): number {
  return (PIPELINE_STAGES as readonly string[]).indexOf(stage);
}
export function isValidStage(stage: string): stage is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(stage);
}
export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage as PipelineStage] ?? stage;
}
export function financeLabel(status: string | null | undefined): string {
  if (!status) return FINANCE_LABELS.unknown;
  return FINANCE_LABELS[status as FinanceStatus] ?? status;
}
