/**
 * Postgres NUMERIC columns are returned by PostgREST/supabase-js as STRINGS
 * (e.g. "160000.00"), but the client types them as `number | null`
 * (FullAllocation) and compares them with `strToNum(input) !== stored`.
 * string-vs-number `!==` is always true, so every edit falsely flags the
 * price fields as changed — forcing a spurious "reason required" on innocuous
 * edits (Uwe, lot 236, 2026-05-26). Coerce the numeric columns to real numbers
 * at the API boundary so the contract matches the type.
 */
const NUMERIC_KEYS = [
  "sqm",
  "wholesale_price",
  "retail_price",
  "house_cost",
  "land_rate_override_per_sqm",
  "x_pct",
  "y_pct",
] as const;

export function coerceAllocationNumerics<T extends Record<string, unknown>>(
  row: T,
): T {
  const out: Record<string, unknown> = { ...row };
  for (const k of NUMERIC_KEYS) {
    const v = out[k];
    if (v === null || v === undefined) continue;
    if (typeof v === "string") {
      const n = Number(v);
      out[k] = v.trim() === "" || Number.isNaN(n) ? null : n;
    }
  }
  return out as T;
}
