// Funder Demand-Coverage Report — data seam + assembly.
//
// Maps an estate's DB rows (registrations + priced lots) into the pure engine's shapes
// (src/lib/reports/funder-demand.ts), runs the builders, and assembles the report + a flat gap
// list (the "Data to instrument" appendix). Read-only service-role queries — no LLM SQL, no writes.
//
// This is also the LLM layer's CONTRACT: FUNDER_REPORT_CAPABILITIES enumerates which metrics are
// real / self-declared / proxy / gap, so a future LLM orchestrator composing reports from these
// primitives knows — at request time — exactly what it can answer and what is a gap (and why).

import { createSupabaseService } from "@/lib/supabase-service";
import {
  buildFunnel,
  funnelConversions,
  buildCoverage,
  buildBuyerMix,
  buildTrend,
  isOk,
  COVER_STAGE_LABEL,
  type RegRow,
  type LotRow,
  type FunnelStage,
  type Metric,
} from "./funder-demand";

// ── Estate source map (which tables back each estate, and what they support) ─────────────────────

interface EstateSource {
  slug: string;
  name: string;
  registrationsTable: string;
  selectionField: string | null; // lots_selected / units_selected / null (no lot-level interest)
  lotTable?: { table: string; idField: string; hasStage: boolean };
  // When true, this estate is on the two-stage ROI portal: registered = waitlist_registrations,
  // qualified = registrations (with ranked_unit_numbers + finance/buyer in payload). When false
  // (legacy), the single registrationsTable carries everything and registering IS qualifying.
  roiPortal?: boolean;
}

const SOURCES: Record<string, EstateSource> = {
  seafields: {
    slug: "seafields",
    name: "Seafields Estate",
    registrationsTable: "seafields_registrations",
    selectionField: "lots_selected",
    lotTable: { table: "seafields_lot_allocations", idField: "lot_number", hasStage: true },
  },
  branscombe: {
    slug: "branscombe",
    name: "Branscombe Estate",
    registrationsTable: "branscombe_registrations", // legacy (superseded by the ROI tables)
    selectionField: "units_selected",
    lotTable: { table: "branscombe_unit_allocations", idField: "unit_number", hasStage: false },
    roiPortal: true,
  },
  wavecrest: {
    slug: "wavecrest",
    name: "Wavecrest Estate",
    registrationsTable: "wavecrest_registrations",
    selectionField: null, // general ROI, no lot selection captured
  },
  "dutton-terrace": {
    slug: "dutton-terrace",
    name: "Dutton Terrace",
    registrationsTable: "dutton_registrations",
    selectionField: null, // concept stage, no lot selection / no priced lot table
  },
};

export function reportableEstates(): { slug: string; name: string }[] {
  return Object.values(SOURCES).map((s) => ({ slug: s.slug, name: s.name }));
}

// ── Capability manifest — the LLM orchestrator's contract ────────────────────────────────────────

export type CapabilityBasis = "real" | "self-declared" | "proxy" | "gap";

export interface CapabilityEntry {
  metric: string;
  basis: CapabilityBasis;
  note: string;
}

/**
 * What the funder-demand primitives can and cannot answer, and on what basis. A future LLM layer
 * reads this to compose reports from the primitives and to declare gaps at request time — without
 * touching SQL or guessing. Keep it in sync with the builders.
 */
export const FUNDER_REPORT_CAPABILITIES: CapabilityEntry[] = [
  { metric: "registered count", basis: "real", note: "top-of-funnel leads — waitlist_registrations (ROI portal) or row count (legacy)." },
  { metric: "distinct registrants", basis: "real", note: "de-duplicated by lowercased email." },
  { metric: "qualified (completed registration form)", basis: "real", note: "distinct registrants who completed the 2nd-stage form — registrations rows for ROI-portal estates; equals registered for legacy single-form estates." },
  { metric: "verified / spoken to", basis: "gap", note: "no contact/verification field on a registration." },
  { metric: "pre-qualified (borrowing capacity)", basis: "gap", note: "no income/capacity captured." },
  { metric: "finance pre-approval", basis: "self-declared", note: "finance_status = 'Pre-approved by lender' (unverified)." },
  { metric: "deposit down", basis: "proxy", note: "closest signal is an admin intent-lock on a lot — NOT money paid." },
  { metric: "contract signed / settled", basis: "gap", note: "no contract/settlement fields." },
  { metric: "coverage by lot", basis: "real", note: "lots_selected/units_selected demand vs the priced lot table (Seafields, Branscombe only)." },
  { metric: "coverage by price tier", basis: "real", note: "lots grouped by retail_price tiers." },
  { metric: "owner-occupier vs investor split", basis: "self-declared", note: "from buyer_type." },
  { metric: "first-home-buyer count", basis: "self-declared", note: "buyer_type = 'First Home Buyer'." },
  { metric: "FHB scheme eligibility", basis: "gap", note: "income/price-cap eligibility not assessed." },
  { metric: "finance-ready count", basis: "self-declared", note: "finance_status in {pre-approved, cash}." },
  { metric: "borrowing-capacity / income bands", basis: "gap", note: "not captured." },
  { metric: "registrations week-by-week + run-rate", basis: "real", note: "from created_at." },
  { metric: "projected date to cover trigger", basis: "real", note: "registered-interest stage only; needs a threshold + lot supply." },
  { metric: "registered→qualified velocity", basis: "real", note: "registered (waitlist) and qualified (registrations) are both real counts, so the conversion + qualified-stage trend are computed for ROI-portal estates." },
];

// ── Assembled report ─────────────────────────────────────────────────────────────────────────────

export interface GapEntry {
  section: string;
  label: string;
  reason: string;
  toInstrument: string;
}

export interface FunderDemandReport {
  estate: { slug: string; name: string };
  generatedAt: string;
  coverStage: string;
  dataError: string | null;
  funnel: ReturnType<typeof buildFunnel>;
  conversions: ReturnType<typeof funnelConversions>;
  coverage: ReturnType<typeof buildCoverage>;
  buyerMix: ReturnType<typeof buildBuyerMix>;
  trend: ReturnType<typeof buildTrend>;
  gaps: GapEntry[];
  capabilities: CapabilityEntry[];
}

/** Default funding-trigger cover Uwe references ("three-times cover"). Tunable per estate later. */
const DEFAULT_COVER_THRESHOLD = 3;

interface RawReg {
  email: string | null;
  buyer_type: string | null;
  finance_status: string | null;
  created_at: string;
  [k: string]: unknown; // the dynamic selection field
}

interface RawLot {
  retail_price: number | null;
  allocated_to: string | null;
  stage?: string | null;
  intent_locked_to_registration_id: string | null;
  [k: string]: unknown; // the dynamic id field
}

export async function buildFunderDemandReport(
  slug: string,
  opts: { coverThreshold?: number; now?: Date } = {},
): Promise<FunderDemandReport> {
  const source = SOURCES[slug];
  if (!source) throw new Error(`Unknown estate slug for funder report: ${slug}`);

  const now = opts.now ?? new Date();
  const supabase = createSupabaseService();
  let dataError: string | null = null;

  // `registeredRows` = top of funnel (every lead); `qualifiedRows` = those who completed the
  // 2nd-stage form. For legacy estates they're the same set (one form does both).
  let registeredRows: RegRow[] = [];
  let qualifiedRows: RegRow[] = [];
  let coverStageLabel: string | undefined;

  if (source.roiPortal) {
    // --- new two-stage ROI flow (keyed by estate_id) ---
    coverStageLabel =
      "completed registrations (EOI with a home selection) — NOT finance-ready buyers";
    const { data: estateRow } = await (supabase.from("estates") as any)
      .select("id")
      .eq("slug", source.slug)
      .maybeSingle();
    const estateId = estateRow?.id ?? null;
    if (!estateId) {
      dataError = `Estate '${source.slug}' is not in the estates table.`;
    } else {
      // Registered (stage 1): the light waitlist. No lot/finance here.
      const { data: wl, error: wlErr } = await (supabase.from("waitlist_registrations") as any)
        .select("email, buyer_category, submitted_at, created_at")
        .eq("estate_id", estateId);
      if (wlErr) {
        dataError = `Could not read waitlist_registrations: ${wlErr.message}`;
      } else {
        registeredRows = (wl ?? []).map((r: any) => ({
          email: r.email,
          selection: [],
          buyerType: canonicalBuyerType(r.buyer_category),
          financeStatus: null,
          createdAt: r.submitted_at ?? r.created_at,
        }));
      }
      // Qualified (stage 2): the EOI. Lot selection + buyer/finance live in payload.
      if (!dataError) {
        const { data: rg, error: rgErr } = await (supabase.from("registrations") as any)
          .select("ranked_unit_numbers, submitted_at, created_at, payload")
          .eq("estate_id", estateId);
        if (rgErr) {
          dataError = `Could not read registrations: ${rgErr.message}`;
        } else {
          qualifiedRows = (rg ?? []).map((r: any) => {
            const p = (r.payload ?? {}) as Record<string, unknown>;
            return {
              email: (p.email as string) ?? null,
              selection: normaliseSelection(r.ranked_unit_numbers),
              buyerType: canonicalBuyerType(
                (p.buyer_category as string) ?? (p.buyer_type as string) ?? null,
              ),
              financeStatus: (p.finance_status as string) ?? null,
              createdAt: r.submitted_at ?? r.created_at,
            };
          });
        }
      }
    }
  } else {
    // --- legacy single-table flow (registering IS qualifying) ---
    const regCols = ["email", "buyer_type", "finance_status", "created_at"];
    if (source.selectionField) regCols.push(source.selectionField);
    const { data: regData, error: regErr } = await supabase
      .from(source.registrationsTable)
      .select(regCols.join(","));
    if (regErr) {
      dataError = `Could not read ${source.registrationsTable}: ${regErr.message}`;
    } else {
      registeredRows = (regData as unknown as RawReg[] | null ?? []).map((r) => ({
        email: r.email,
        selection: source.selectionField
          ? normaliseSelection(r[source.selectionField])
          : [],
        buyerType: r.buyer_type,
        financeStatus: r.finance_status,
        createdAt: r.created_at,
      }));
    }
    qualifiedRows = registeredRows; // one form does both
  }

  // --- lots (only where a priced table exists) ---
  let lotRows: LotRow[] = [];
  if (source.lotTable && !dataError) {
    const lotCols = [
      source.lotTable.idField,
      "retail_price",
      "allocated_to",
      "intent_locked_to_registration_id",
    ];
    if (source.lotTable.hasStage) lotCols.push("stage");
    const { data: lotData, error: lotErr } = await supabase
      .from(source.lotTable.table)
      .select(lotCols.join(","));
    if (lotErr) {
      dataError = `Could not read ${source.lotTable.table}: ${lotErr.message}`;
    } else {
      lotRows = (lotData as unknown as RawLot[] | null ?? []).map((l) => ({
        id: String(l[source.lotTable!.idField]),
        retailPrice: l.retail_price == null ? null : Number(l.retail_price),
        allocatedTo: l.allocated_to ?? null,
        stage: source.lotTable!.hasStage ? (l.stage ?? null) : null,
        intentLockedRegId: l.intent_locked_to_registration_id ?? null,
      }));
    }
  }

  // --- run the primitives ---
  // Funnel spans both stages; coverage / buyer-mix / trend run on the QUALIFIED rows, because
  // that's where lot selection + finance live (for legacy, qualified === registered).
  const funnel = buildFunnel(registeredRows, qualifiedRows);
  const conversions = funnelConversions(funnel.stages);
  const coverage = buildCoverage(qualifiedRows, lotRows, { coverStageLabel });
  const buyerMix = buildBuyerMix(qualifiedRows);
  const totalLots = isOk(coverage) ? coverage.value.totalLots : undefined;
  const trend = buildTrend(qualifiedRows, {
    coverThreshold: opts.coverThreshold ?? DEFAULT_COVER_THRESHOLD,
    totalLots,
    now,
    coverStageLabel,
  });

  return {
    estate: { slug: source.slug, name: source.name },
    generatedAt: now.toISOString(),
    coverStage: coverStageLabel ?? COVER_STAGE_LABEL,
    dataError,
    funnel,
    conversions,
    coverage,
    buyerMix,
    trend,
    gaps: collectGaps({ funnel, coverage, buyerMix, trend }),
    capabilities: FUNDER_REPORT_CAPABILITIES,
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────────────────────────

/** lots_selected / units_selected / ranked_unit_numbers come back as an array; coerce to string[]. */
function normaliseSelection(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [];
}

/**
 * Translate the ROI portal's short buyer vocabulary (owner-occupier | investor |
 * first-home-buyer) into the engine's canonical strings, so the (legacy-calibrated)
 * classifyBuyer / FHB logic in funder-demand.ts works unchanged. Legacy-style values pass
 * through untouched.
 */
function canonicalBuyerType(v: string | null): string | null {
  if (!v) return null;
  const t = v.toLowerCase();
  if (t.includes("first") && t.includes("home")) return "First Home Buyer";
  if (t.includes("investor")) return "Investor — Rental / SMSF";
  if (t.includes("owner")) return "Owner Occupier";
  return v;
}

/** Flatten every structured gap across the sections into the "Data to instrument" appendix. */
function collectGaps(parts: {
  funnel: ReturnType<typeof buildFunnel>;
  coverage: ReturnType<typeof buildCoverage>;
  buyerMix: ReturnType<typeof buildBuyerMix>;
  trend: ReturnType<typeof buildTrend>;
}): GapEntry[] {
  const out: GapEntry[] = [];
  const push = (section: string, label: string, m: Metric<unknown>) => {
    if (m.status === "gap") out.push({ section, label, ...m.gap });
  };

  for (const s of parts.funnel.stages) push("Pipeline", s.label, s.metric);
  push("Coverage", "Demand vs supply by lot/tier", parts.coverage);
  push("Buyer mix", "Borrowing-capacity bands", parts.buyerMix.borrowingCapacityBands);
  push("Buyer mix", "Income bands", parts.buyerMix.incomeBands);
  push("Buyer mix", "First-home-buyer scheme eligibility", parts.buyerMix.fhbSchemeEligibility);
  push("Trend", "Projected date to cover trigger", parts.trend.projectedCover);

  // de-dup identical (label+reason) gaps (e.g. funnel "deposit" proxy vs coverage)
  const seen = new Set<string>();
  return out.filter((g) => {
    const k = `${g.label}::${g.reason}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Re-export for the page (avoids the page importing both modules).
export type { FunnelStage };
