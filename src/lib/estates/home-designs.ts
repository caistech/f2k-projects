import { cache } from "react";
import type { Design } from "@caistech/property-launch-kit/components";
import { createSupabaseService } from "@/lib/supabase-service";

/**
 * Home-design cards for the public estate pages — the DB-backed layer behind the
 * /admin/estates/[estate]/designs editor (migration 0074).
 *
 * These cards used to be a hardcoded array in the estate page, so every copy tweak (a floor area,
 * a price moving to "Price on application") needed a developer and a deploy. They are now rows an
 * operator edits, and this module is the read side.
 *
 * Fail-soft by contract: this read runs inside a public marketing page, so a missing env at build
 * time, a DB hiccup, or an unseeded table must degrade to the code fallback below — never an empty
 * gallery and never a thrown build.
 */

export interface DesignRow {
  id: string;
  estate_slug: string;
  sort_order: number;
  name: string;
  tag: string;
  beds: string;
  size: string;
  detail: string;
  hero_url: string | null;
  plan_url: string | null;
  secondary_label: string | null;
  secondary_href: string | null;
  price_from: string;
  price_label: string | null;
  is_published: boolean;
  updated_at: string;
  updated_by: string | null;
}

export const DESIGN_SELECT =
  "id, estate_slug, sort_order, name, tag, beds, size, detail, hero_url, plan_url, secondary_label, secondary_href, price_from, price_label, is_published, updated_at, updated_by";

/**
 * The Seafields cards as seeded by migration 0074 (Uwe's 2026-07-26 edits applied).
 *
 * This is the LAST-RESORT fallback, not a second source of truth: it is served only when the table
 * has no rows at all for the estate (unseeded / unreachable). Once seeded, the DB wins — including
 * the case where an operator has unpublished every card, which renders an empty gallery rather than
 * resurrecting these.
 */
const SEAFIELDS_FALLBACK: Design[] = [
  {
    name: "Joey",
    size: "≈61m² internal · ~100m² with verandah & carport",
    beds: "2 bed · 2 bath",
    tag: "ANCILLARY / DOWNSIZER",
    detail:
      "Compact 2-bedroom 2-bathroom ancillary dwelling — master with ensuite, second bedroom, open living/kitchen, optional carport + verandah. Ideal as a downsizer, holiday let, or second dwelling on a larger lot.",
    hero: "/seafields/designs/joey/coastal.jpg",
    plan: "/seafields/designs/joey.png",
    priceFrom: "$297,900",
    priceLabel: "House only — from",
  },
  {
    name: "Koala",
    size: "≈71m² internal · ~110m² with verandah & carport",
    beds: "2 bed · 1 bath",
    tag: "ANCILLARY / DUAL-OCC",
    detail:
      "Two-bedroom one-bathroom ancillary dwelling with carport + verandah — a slightly larger footprint suited to granny-flat / dual-occupancy use on lots ≥600m² under R20.",
    hero: "/seafields/designs/koala.png",
    plan: "/seafields/designs/koala.png",
    priceFrom: "$327,700",
    priceLabel: "House only — from",
  },
  {
    name: "3x2 Modular",
    size: "158m² internal · ~181m² with verandah",
    beds: "3 bed · 2 bath",
    tag: "GROH ELIGIBLE",
    detail:
      "GROH-approved 3-bedroom 2-bathroom modular home. Government Regional Officer Housing eligible. Suitable for first-home buyers and small families. House & land pricing on application.",
    hero: "/seafields/designs/3x2.png",
    plan: "/seafields/designs/3x2.png",
    priceFrom: "Price on application",
    priceLabel: "",
  },
  {
    name: "4x2 Modular",
    size: "162m² · ~192m² with verandah",
    beds: "4 bed · 2 bath",
    tag: "GROH ELIGIBLE",
    detail:
      "GROH-approved 4-bedroom 2-bathroom modular home. Larger family layout with the same modular delivery economics.",
    hero: "/seafields/designs/4x2.png",
    plan: "/seafields/designs/4x2.png",
    priceFrom: "Price on application",
    priceLabel: "",
  },
  {
    name: "EMU",
    size: "191m² home · 218m² with alfresco",
    beds: "4 bed · 2 bath",
    tag: "FAMILY HOME",
    detail:
      "Elevate-series 4-bedroom 2-bathroom family home with theatre, study and walk-in robe, plus upgraded elevations, claddings, windows and entry. Optional alfresco and carport. House & land pricing on application.",
    hero: "/seafields/designs/emu.png",
    plan: "/seafields/designs/emu.png",
    priceFrom: "Price on application",
    priceLabel: "",
  },
  {
    name: "BigRoo",
    size: "≈310m²",
    beds: "4 bed · 2 bath + Theatre",
    tag: "PREMIUM",
    detail:
      "Premium ≈310m² modular with dedicated theatre room and walk-in robes. Architect-designed kitchen feature. The flagship family home.",
    hero: "/seafields/designs/bigroo.png",
    plan: "/seafields/designs/bigroo.png",
    priceFrom: "Price on application",
    priceLabel: "",
  },
];

const FALLBACKS: Record<string, Design[]> = { seafields: SEAFIELDS_FALLBACK };

/** DB row → the gallery's Design shape. */
export function rowToDesign(row: DesignRow): Design {
  return {
    name: row.name,
    size: row.size,
    beds: row.beds,
    tag: row.tag,
    detail: row.detail,
    hero: row.hero_url,
    plan: row.plan_url,
    priceFrom: row.price_from,
    // NULL means "use the gallery default"; "" means "no prefix". Passing undefined preserves the
    // first meaning, so a null must NOT be coerced to "" here.
    ...(row.price_label === null ? {} : { priceLabel: row.price_label }),
    ...(row.secondary_label && row.secondary_href
      ? { secondary: { label: row.secondary_label, href: row.secondary_href } }
      : {}),
    // A card with no hero renders the "Floor plan pending" placeholder instead of a broken image.
    ...(row.hero_url ? {} : { placeholder: true }),
  };
}

/**
 * Read the rows for an estate. Deliberately NOT wrapped in `unstable_cache`.
 *
 * It was, and that second cache layer was exactly what made a saved change invisible: measured
 * against production, an admin save produced `x-vercel-cache: REVALIDATED` — the page really did
 * re-render — and the re-render still read the stale cached rows, so the operator's change never
 * appeared. The route cache IS the cache here: the estate pages are ISR (`revalidate = 300`) and
 * every write calls `revalidatePath` on the estate, so this query runs at most once per re-render.
 * Six rows on a page that re-renders on save or every five minutes is not worth a second cache
 * layer, let alone one that can silently serve last week's copy.
 */
async function loadRows(estateSlug: string): Promise<DesignRow[] | null> {
  {
    try {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.SUPABASE_SERVICE_ROLE_KEY
      ) {
        // Say so. This branch returning null silently is indistinguishable from "the estate has no
        // designs", and that ambiguity cost real time: a card that was demonstrably in the database
        // never appeared on the page, with nothing anywhere to say why.
        console.error(
          `[estate-designs] ${estateSlug}: Supabase env missing at render (url=${Boolean(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
          )} serviceKey=${Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)}) — falling back`,
        );
        return null;
      }
      const supabase = createSupabaseService();
      const { data, error } = await supabase
        .from("estate_home_designs")
        .select(DESIGN_SELECT)
        .eq("estate_slug", estateSlug)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) {
        console.error("[estate-designs] load failed:", error.message);
        return null;
      }
      const rows = (data ?? []) as DesignRow[];
      console.log(
        `[estate-designs] ${estateSlug}: ${rows.length} row(s), ${rows.filter((r) => r.is_published).length} published`,
      );
      return rows;
    } catch (e) {
      console.error("[estate-designs] load threw:", e);
      return null;
    }
  }
}

/**
 * Published design cards for an estate, in display order.
 *
 * Returns the code fallback when the table is unreachable or holds no rows for this estate at all.
 * An estate whose rows exist but are all unpublished returns [] — that is a deliberate operator
 * state, not a failure, and must be honoured.
 */
export const getEstateDesigns = cache(
  async (estateSlug: string): Promise<Design[]> => {
    const rows = await loadRows(estateSlug);
    if (rows === null || rows.length === 0) {
      return FALLBACKS[estateSlug] ?? [];
    }
    return rows.filter((r) => r.is_published).map(rowToDesign);
  },
);
