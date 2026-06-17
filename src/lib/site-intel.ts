import {
  createSiteIntel,
  type SiteIntelResult,
  type GeoJSONFeatureCollection,
} from "@caistech/site-intelligence";

/**
 * National site intelligence (LGA / wind region / climate zone) for a lat/lng, resolved by
 * point-in-polygon over the CANONICAL datasets that live in the property-services Supabase
 * `site-data` bucket (council_clean.geojson = all 547 AU LGAs, wind_regions.geojson, climate_clean
 * .geojson). The bucket is PUBLIC-read, so we use a plain fetch loader against the public object
 * URL — no Supabase client or key needed. Server-only (uses PROPERTY_SERVICES_URL).
 *
 * This is the all-of-Australia LGA-name resolver f2k lacked: property-services' planning-scheme
 * table only covers ~20 LGAs (QLD/TAS/WA), so SA addresses (e.g. Tumby Bay) returned no LGA. The
 * GeoJSON boundaries cover every LGA in every state.
 */

export type { SiteIntelResult };

const PUBLIC_BASE = (
  process.env.PROPERTY_SERVICES_URL ||
  process.env.NEXT_PUBLIC_PROPERTY_SERVICES_URL ||
  ""
).replace(/\/$/, "");

// Singleton so the in-memory dataset cache (CachedLoader) survives across calls in a warm instance.
let intel: ReturnType<typeof createSiteIntel> | null = null;

function getIntel() {
  if (!intel) {
    intel = createSiteIntel({
      loader: async (datasetName: string): Promise<GeoJSONFeatureCollection | null> => {
        if (!PUBLIC_BASE) return null;
        const url = `${PUBLIC_BASE}/storage/v1/object/public/site-data/${datasetName}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        return (await res.json()) as GeoJSONFeatureCollection;
      },
    });
  }
  return intel;
}

/** True when the property-services base URL is configured (so the public bucket is reachable). */
export function siteIntelConfigured(): boolean {
  return Boolean(PUBLIC_BASE);
}

/** Resolve LGA / wind / climate for a point. Returns null on any failure (never throws). */
export async function deriveSiteIntel(
  lat: number,
  lng: number,
): Promise<SiteIntelResult | null> {
  if (!PUBLIC_BASE) return null;
  try {
    return await getIntel().derive(lat, lng);
  } catch {
    return null;
  }
}
