/**
 * Shared field validation for the home-design admin API (create + update).
 *
 * Lives here rather than being exported from the route module because Next's App Router validates
 * route files against a fixed export shape — a helper exported alongside GET/POST fails the build.
 */

/** Fields an operator may set. Anything else in the body is ignored, not merged. */
const TEXT_FIELDS = [
  "name",
  "tag",
  "beds",
  "size",
  "detail",
  "hero_url",
  "plan_url",
  "secondary_label",
  "secondary_href",
  "price_from",
  "price_label",
] as const;

type TextField = (typeof TEXT_FIELDS)[number];

/** Columns where "" is a meaningful value distinct from NULL (see migration 0074 on price_label). */
const EMPTY_STRING_IS_MEANINGFUL = new Set<TextField>(["price_label"]);

/** Columns that must never be blank — a card with no name has no identity in the gallery. */
const REQUIRED = new Set<TextField>(["name", "price_from"]);

/**
 * Validate + normalise an admin payload into column values.
 *
 * `partial: true` (PATCH) touches only the keys present in the body, so a publish toggle or a
 * reorder can't blank the copy fields it didn't send.
 */
export function pickDesignFields(
  body: Record<string, unknown>,
  { partial }: { partial: boolean },
): { values: Record<string, unknown>; error: string | null } {
  const values: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    if (partial && !(field in body)) continue;
    const raw = body[field];
    if (raw !== undefined && raw !== null && typeof raw !== "string") {
      return { values: {}, error: `${field} must be a string` };
    }
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    if (REQUIRED.has(field) && trimmed === "") {
      return { values: {}, error: `${field.replace(/_/g, " ")} is required` };
    }
    values[field] =
      trimmed === "" && !EMPTY_STRING_IS_MEANINGFUL.has(field) && !REQUIRED.has(field)
        ? null
        : trimmed;
  }

  if (!partial || "is_published" in body) {
    values.is_published = body.is_published !== false;
  }
  if (!partial || "sort_order" in body) {
    const n = Number(body.sort_order);
    if (!Number.isFinite(n)) {
      return { values: {}, error: "sort_order must be a number" };
    }
    values.sort_order = Math.trunc(n);
  }

  return { values, error: null };
}
