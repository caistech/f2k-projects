import { createPropertyServices } from "@caistech/property-services-sdk";
import type { PropertyProfile, SiteDossier } from "@caistech/property-services-sdk";

/**
 * Kickstart property analysis for an estate address.
 *
 * Two depths (the `depth` arg), because the two callers have opposite constraints:
 *  - `dossier` (default) — ONE metered call that aggregates every dataset property-services offers:
 *    the derived profile (wind/BAL/climate, zoning envelope, terrain/buildability, LGA, overlays,
 *    torrens/strata yield), the AI suitability assessment (scored against the F2K modular-estate use
 *    case), the Domain AVM price position + comparables, and the panel-review checklist + write-backs.
 *    The AI + AVM legs make it slow (tens of seconds), so it is for the OPERATOR-INITIATED site-check
 *    tool where a long budget + a spinner are fine. Every dossier section is fail-open.
 *  - `profile` — the fast `derive` leg only (everything EXCEPT price + suitability + panel review).
 *    For the lead-capture onboarding path, which must respond quickly and only ever displays the
 *    profile fields anyway; the dossier's slow legs would time out and block the prospect's submit.
 *    Price/suitability/panel fields come back null in this mode.
 *
 * Best-effort by contract: env-gated, time-bounded, and never throws — a failure returns a
 * {status:'skipped'|'error'} record so the onboarding submission is never blocked.
 *
 * Note: property-services is geocode/address-driven. We geocode by locality (suburb + postcode),
 * passing precise lat/lng from the address autocomplete when we have them. Locality-level coverage
 * always returns the wind/bushfire/climate layer; zoning + LGA + maxLots + price fill in where
 * property-services has coverage. Parcel-precise lookups (from a full street address / title) are
 * a later refinement.
 */

/** The F2K intent the AI suitability assessment is scored against. */
const F2K_USE_CASE =
  "Modular residential estate development — building factory-built/modular homes and subdividing " +
  "the land (Torrens or strata) into a small residential estate.";

export interface PropertyCheck {
  status: "ok" | "skipped" | "error";
  ran_at: string;
  address?: string;
  reason?: string;
  summary?: string | null;
  // --- Environment ---
  wind_region?: string | null;
  wind_speed?: number | null;
  bal?: string | null;
  climate_zone?: string | null;
  // --- Zoning + LGA ---
  lga_name?: string | null;
  lga_coverage?: string | null;
  zoning_code?: string | null;
  zoning_name?: string | null;
  zoning_max_height?: number | null;
  zoning_min_lot_size?: number | null;
  zoning_permitted_uses?: string[] | null;
  modular_provisions?: string | null;
  // --- Lot ---
  lot_size?: number | null;
  lot_number?: string | null;
  plan_number?: string | null;
  parcel_id?: string | null;
  // --- Terrain / buildability ---
  slope_percent?: number | null;
  buildability?: string | null;
  // --- Subdivision ---
  subdivision_permitted?: boolean | null;
  max_lots?: number | null;
  lot_size_each?: number | null;
  strata_permitted?: boolean | null;
  subdivision_recommendations?: string[] | null;
  subdivision_warnings?: string[] | null;
  // --- AI suitability assessment (assess leg) ---
  suitability_suitable?: boolean | null;
  suitability_confidence?: string | null;
  suitability_verdict?: string | null;
  suitability_risks?: string[] | null;
  suitability_next_steps?: string[] | null;
  // --- Price position (Domain AVM / comparables leg) ---
  price_lower?: number | null;
  price_mid?: number | null;
  price_upper?: number | null;
  price_confidence?: string | null;
  comparables_count?: number | null;
  comparables_median?: number | null;
  // --- Panel review checklist + professional write-backs ---
  panel_review_open?: number | null;
  panel_review_completed?: number | null;
  contributions_count?: number | null;
  overlays?: Array<{ type: string; name: string; requiresReport: boolean }>;
  /** The full SiteDossier as returned — nothing property-services provided is dropped. */
  data?: unknown;
}

interface LeadLocation {
  estate_location?: string | null;
  estate_postcode?: string | null;
  lot_plan_reference?: string | null;
  /** Captured from the Mapbox address autocomplete when the user picks a suggestion. */
  estate_state?: string | null;
  estate_lat?: number | null;
  estate_lng?: number | null;
}

/** AU state from a 4-digit postcode's leading digit(s). Broad but enough to catch a
 *  geocode that lands in the wrong state (e.g. SA 5605 resolving to QLD). */
export function auStateFromPostcode(pc?: string | null): string | null {
  const n = (pc || "").trim();
  if (!/^\d{4}$/.test(n)) return null;
  if (n.startsWith("08") || n.startsWith("09")) return "NT";
  const byFirst: Record<string, string> = {
    "2": "NSW", "3": "VIC", "4": "QLD", "5": "SA", "6": "WA", "7": "TAS",
  };
  return byFirst[n[0]] ?? null;
}

export async function runPropertyCheck(
  lead: LeadLocation,
  timeoutMs = 25_000,
  depth: "profile" | "dossier" = "dossier",
): Promise<PropertyCheck> {
  const ran_at = new Date().toISOString();
  // Accept either the server-side names or the portfolio's NEXT_PUBLIC_* convention
  // (DealFindrs / mmcbuild use the prefixed names) so whichever is set on Vercel works.
  const supabaseUrl =
    process.env.PROPERTY_SERVICES_URL || process.env.NEXT_PUBLIC_PROPERTY_SERVICES_URL;
  const apiKey =
    process.env.PROPERTY_SERVICES_API_KEY ||
    process.env.NEXT_PUBLIC_PROPERTY_SERVICES_API_KEY;

  if (!supabaseUrl || !apiKey) {
    return { status: "skipped", ran_at, reason: "property-services env not configured" };
  }
  const suburb = lead.estate_location?.trim();
  const postcode = lead.estate_postcode?.trim();
  if (!suburb) {
    return { status: "skipped", ran_at, reason: "no location to geocode" };
  }

  // Precise coords from the address autocomplete (when the user picked a suggestion).
  const lat = lead.estate_lat ?? undefined;
  const lng = lead.estate_lng ?? undefined;
  // Expected state: from the selected address, else inferred from the postcode. Used to
  // anchor the geocode AND to reject a text-geocode that lands in the wrong state.
  const expectedState = lead.estate_state?.trim() || auStateFromPostcode(postcode) || undefined;

  // Geocodable string: locality + state + postcode. Deliberately NOT the lot/plan reference —
  // a Torrens plan id ("Allotment 50 Deposited Plan 90582") is not geocodable and drags Mapbox
  // to the wrong place (it returned a Gold Coast QLD point for an SA address). The plan ref stays
  // on the row for manual parcel lookup only.
  const address = [suburb, expectedState, postcode, "Australia"]
    .filter(Boolean)
    .join(", ");

  const client = createPropertyServices({ supabaseUrl, apiKey, product: "f2k" });

  try {
    // Pass lat/lng/state when known so property-services skips re-geocoding (exact match).
    const call =
      depth === "dossier"
        ? // ONE metered call → profile + assessment + price + panel review + write-backs.
          client.dossier({
            address,
            lat,
            lng,
            suburb,
            state: expectedState,
            postcode: postcode || undefined,
            useCase: F2K_USE_CASE,
          })
        : // Fast path → the derive profile leg only (no slow AVM / AI legs).
          client.derive({
            address,
            lat,
            lng,
            suburb,
            state: expectedState,
            postcode: postcode || undefined,
          });

    const res = (await Promise.race([
      call,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs),
      ),
    ])) as Awaited<ReturnType<typeof client.dossier>> | Awaited<ReturnType<typeof client.derive>>;

    if (!res?.success || !res.data) {
      return { status: "error", ran_at, address, reason: res?.error || `${depth} returned no data` };
    }

    // Normalise the two shapes: `dossier` wraps the profile in `.profile` and adds the
    // assessment/price/plannerReview/contributions legs; `derive` returns the profile as `.data`.
    const dossier = depth === "dossier" ? (res.data as SiteDossier) : null;
    const profile = (dossier ? dossier.profile : (res.data as PropertyProfile)) ?? null;

    // The profile (derive) is the core leg — with it null there is no meaningful site analysis.
    if (!profile) {
      return { status: "error", ran_at, address, reason: "property profile could not be derived" };
    }

    // Guardrail: if we did NOT have precise coords and the geocoded state contradicts the
    // expected (postcode-derived) state, the lookup is unreliable — don't store a confidently
    // wrong council/zoning; flag it for a manual address check instead.
    const geocodedState = profile.address?.state ?? null;
    if (
      lat == null &&
      expectedState &&
      geocodedState &&
      geocodedState.toUpperCase() !== expectedState.toUpperCase()
    ) {
      return {
        status: "error",
        ran_at,
        address,
        reason: `Geocoded to ${geocodedState}, but ${postcode ? `postcode ${postcode}` : "the entered location"} indicates ${expectedState}. Not stored — enter the specific street address and re-run.`,
      };
    }

    const assessment = dossier?.assessment ?? null;
    const price = dossier?.price ?? null;
    const torrens = profile.subdivision?.torrens;

    const pc: PropertyCheck = {
      status: "ok",
      ran_at,
      address,
      summary: profile.summary ?? null,
      // Environment
      wind_region: profile.environment?.windRegion ?? null,
      wind_speed: profile.environment?.windSpeed ?? null,
      bal: profile.environment?.bal ?? null,
      climate_zone: profile.environment?.climateZone ?? null,
      // Zoning + LGA
      lga_name: profile.metadata?.lgaName ?? null,
      lga_coverage: profile.metadata?.lgaCoverage ?? null,
      zoning_code: profile.zoning?.code ?? null,
      zoning_name: profile.zoning?.name ?? null,
      zoning_max_height: profile.zoning?.maximumHeight ?? null,
      zoning_min_lot_size: profile.zoning?.minimumLotSize ?? null,
      zoning_permitted_uses: profile.zoning?.permittedUses ?? null,
      modular_provisions: profile.zoning?.modularProvisions ?? null,
      // Lot
      lot_size: profile.lot?.lotSize ?? null,
      lot_number: profile.lot?.lotNumber ?? null,
      plan_number: profile.lot?.planNumber ?? null,
      parcel_id: profile.lot?.parcelId ?? null,
      // Terrain / buildability
      slope_percent: profile.terrain?.slopePercent ?? null,
      buildability: profile.terrain?.buildability ?? null,
      // Subdivision
      subdivision_permitted: profile.zoning?.subdivisionPermitted ?? null,
      max_lots: torrens?.maxLots ?? null,
      lot_size_each: torrens?.lotSizeEach ?? null,
      strata_permitted: profile.subdivision?.strata?.feasible ?? null,
      subdivision_recommendations: profile.subdivision?.recommendations ?? null,
      subdivision_warnings: profile.subdivision?.warnings ?? null,
      // AI suitability assessment
      suitability_suitable: assessment?.suitable ?? null,
      suitability_confidence: assessment?.confidence ?? null,
      suitability_verdict: assessment?.verdict ?? null,
      suitability_risks: assessment?.risks ?? null,
      suitability_next_steps: assessment?.nextSteps ?? null,
      // Price position (Domain AVM / comparables)
      price_lower: price?.estimate?.lower ?? null,
      price_mid: price?.estimate?.mid ?? null,
      price_upper: price?.estimate?.upper ?? null,
      price_confidence: price?.estimate?.confidence ?? null,
      comparables_count: price?.stats?.count ?? null,
      comparables_median: price?.stats?.median ?? null,
      // Panel review + write-backs (dossier depth only)
      panel_review_open: dossier
        ? dossier.plannerReview.filter((i) => i.status !== "completed").length
        : null,
      panel_review_completed: dossier
        ? dossier.plannerReview.filter((i) => i.status === "completed").length
        : null,
      contributions_count: dossier ? dossier.contributions.length : null,
      overlays: (profile.overlays ?? []).map((o) => ({
        type: o.type,
        name: o.name,
        requiresReport: o.requiresReport,
      })),
      data: dossier ?? profile,
    };

    // LGA / wind / climate come nationally from property-services (point-in-polygon over the
    // canonical site-data GeoJSON, server-side). No client-side fallback or direct bucket access —
    // the data stays private behind the single metered API call.
    return pc;
  } catch (err) {
    return {
      status: "error",
      ran_at,
      address,
      reason: err instanceof Error ? err.message : `${depth} failed`,
    };
  }
}

/** Format an AUD amount compactly (e.g. $1.2M, $640k). Returns "" for null/undefined. */
function fmtAud(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}

/** Render the property check as an admin-email HTML block (returns "" when nothing useful). */
export function propertyCheckEmailBlock(
  pc: PropertyCheck | null | undefined,
  escapeHtml: (v: string | null | undefined) => string,
): string {
  if (!pc || pc.status === "skipped") return "";
  if (pc.status === "error") {
    return `<h3 style="color:#1A2744;font-size:14px;margin:20px 0 4px">Property check</h3>
      <p style="font-size:13px;color:#9b6b00">Couldn't run automatically (${escapeHtml(pc.reason)}). Worth a manual look.</p>`;
  }
  const row = (label: string, value: string | number | null | undefined) =>
    value || value === 0
      ? `<tr><td style="padding:3px 12px;color:#666;vertical-align:top">${label}</td><td style="padding:3px 12px;color:#1A2744">${escapeHtml(String(value))}</td></tr>`
      : "";
  const overlays = (pc.overlays ?? [])
    .map((o) => o.name + (o.requiresReport ? " (report required)" : ""))
    .join(", ");
  const lo = fmtAud(pc.price_lower);
  const hi = fmtAud(pc.price_upper);
  const mid = fmtAud(pc.price_mid);
  const priceRange = lo && hi ? `${lo}–${hi}${mid ? ` (mid ${mid})` : ""}` : mid || "";
  return `
    <h3 style="color:#1A2744;font-size:14px;margin:20px 0 4px">Property check <span style="color:#999;font-weight:normal">(auto, first-pass)</span></h3>
    <table style="border-collapse:collapse;font-size:13px;width:100%">
      ${row("Wind region", pc.wind_region ? `${pc.wind_region}${pc.wind_speed ? ` (${pc.wind_speed} m/s)` : ""}` : null)}
      ${row("Bushfire (BAL)", pc.bal)}
      ${row("Climate zone", pc.climate_zone)}
      ${row("LGA / council", pc.lga_name ? `${pc.lga_name}${pc.lga_coverage && pc.lga_coverage !== "full" ? ` (${pc.lga_coverage} coverage)` : ""}` : null)}
      ${row("Zoning", pc.zoning_code ? `${pc.zoning_code}${pc.zoning_name ? ` — ${pc.zoning_name}` : ""}` : null)}
      ${row("Modular provisions", pc.modular_provisions)}
      ${row("Lot size", pc.lot_size ? `${pc.lot_size} m²` : null)}
      ${row("Buildability", pc.buildability ? `${pc.buildability}${pc.slope_percent != null ? ` (${pc.slope_percent}% slope)` : ""}` : null)}
      ${row("Subdivision permitted", pc.subdivision_permitted == null ? null : pc.subdivision_permitted ? "Yes" : "No")}
      ${row("Est. max lots (Torrens)", pc.max_lots ? `${pc.max_lots}${pc.lot_size_each ? ` @ ~${pc.lot_size_each} m² each` : ""}` : null)}
      ${row("Est. land value", priceRange)}
      ${row("Suitability (modular estate)", pc.suitability_verdict ? `${pc.suitability_suitable ? "Suitable" : "Check"} — ${pc.suitability_verdict}${pc.suitability_confidence ? ` (${pc.suitability_confidence} confidence)` : ""}` : null)}
      ${row("Overlays", overlays)}
    </table>
    ${pc.summary ? `<p style="font-size:12px;color:#4A5568;margin:6px 0 0">${escapeHtml(pc.summary)}</p>` : ""}`;
}
