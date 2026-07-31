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

/**
 * Columns that must never be blank — a card with no name has no identity in the gallery.
 */
const REQUIRED = new Set<TextField>(["name", "price_from"]);

/**
 * Columns that actually accept NULL in the schema (migration 0074). Everything else is
 * `NOT NULL DEFAULT ''`, so a cleared field must become "" — writing NULL there fails the
 * constraint, which surfaced as a raw Postgres error the moment an operator cleared the category
 * label, and additionally masked the duplicate-name message on create.
 */
const NULLABLE = new Set<TextField>([
  "hero_url",
  "plan_url",
  "secondary_label",
  "secondary_href",
  "price_label",
]);

/**
 * price_label carries THREE distinct states and "" is one of them ("show the price with no
 * prefix"), so a blank string must survive here rather than collapsing to NULL, which means
 * "use the gallery default". Only an explicit null selects the default.
 */
const EMPTY_STRING_IS_MEANINGFUL = new Set<TextField>(["price_label"]);

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

    // An EXPLICIT null is a deliberate choice, not a blank — for price_label it is how the caller
    // selects the gallery's default prefix. Treating it as "" would silently store "no prefix".
    if (raw === null && NULLABLE.has(field)) {
      values[field] = null;
      continue;
    }

    const trimmed = typeof raw === "string" ? raw.trim() : "";
    if (REQUIRED.has(field) && trimmed === "") {
      return { values: {}, error: `${field.replace(/_/g, " ")} is required` };
    }
    if (trimmed !== "" || EMPTY_STRING_IS_MEANINGFUL.has(field) || !NULLABLE.has(field)) {
      values[field] = trimmed;
    } else {
      // Cleared, and the column accepts NULL — an empty link is absent, not an empty string.
      values[field] = null;
    }
  }

  if (!partial || "is_published" in body) {
    values.is_published = body.is_published !== false;
  }
  // sort_order is OPTIONAL on create — a caller that doesn't care about position gets the column
  // default. Requiring it made a create without one fail with "sort_order must be a number", which
  // also MASKED the duplicate-name error the caller actually needed to see.
  if ("sort_order" in body && body.sort_order !== null && body.sort_order !== undefined) {
    const n = Number(body.sort_order);
    if (!Number.isFinite(n)) {
      return { values: {}, error: "sort_order must be a number" };
    }
    values.sort_order = Math.trunc(n);
  }

  return { values, error: null };
}
