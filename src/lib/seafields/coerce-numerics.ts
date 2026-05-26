/**
 * Postgres NUMERIC (decimal) columns are returned by PostgREST/supabase-js as
 * STRINGS (e.g. "160000.00"), but the client types them as `number | null`
 * and edit forms compare `strToNum(input) !== stored`. string-vs-number `!==`
 * is always true, so every edit falsely flags those fields as changed —
 * forcing a spurious "reason required" / phantom "changed" on innocuous edits
 * (Uwe, lots 236/308, 2026-05-26). Coerce the numeric columns to real numbers
 * at the API boundary so the response matches the declared type.
 *
 * NOTE: integer columns (bedrooms, bathrooms, stage_number) come back as JS
 * numbers already, so they are not listed here.
 */
export function coerceNumerics<T extends Record<string, unknown>>(
  row: T,
  keys: readonly string[],
): T {
  const out: Record<string, unknown> = { ...row };
  for (const k of keys) {
    const v = out[k];
    if (v === null || v === undefined) continue;
    if (typeof v === "string") {
      const n = Number(v);
      out[k] = v.trim() === "" || Number.isNaN(n) ? null : n;
    }
  }
  return out as T;
}

export const ALLOCATION_NUMERIC_KEYS = [
  "sqm",
  "wholesale_price",
  "retail_price",
  "house_cost",
  "land_rate_override_per_sqm",
  "x_pct",
  "y_pct",
] as const;

export const STAGE_NUMERIC_KEYS = [
  "rate_per_sqm",
  "escalation_pct",
  "auto_advance_threshold_pct",
] as const;

export const DWELLING_NUMERIC_KEYS = [
  "floor_area_sqm",
  "build_cost_default",
] as const;

export function coerceAllocationNumerics<T extends Record<string, unknown>>(
  row: T,
): T {
  return coerceNumerics(row, ALLOCATION_NUMERIC_KEYS);
}
