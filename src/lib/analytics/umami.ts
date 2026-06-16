// Low-level Umami Cloud API client + pure mappers (FTK analytics Phase 1).
//
// One Umami "website" (bucket) for the whole f2k site; per-estate numbers come from filtering
// by URL path (the estate's `href`). This module degrades-don't-fakes: if the env isn't set or
// the API call fails, it returns null and the dashboard renders a clean "unavailable" state.
//
// ⚠️ T1 SPIKE: confirm against the live Umami Cloud account before trusting in prod —
//   (a) base URL + auth header shape (Cloud uses `x-umami-api-key`; self-host uses Bearer),
//   (b) that the free Hobby tier exposes the read API at all,
//   (c) the exact field names in /stats (`pageviews`/`visitors`/`visits`) and /metrics,
//   (d) free-tier rate limits + history retention.
// The function/field names below match Umami v2's documented API; the seam is here so a
// Cloud→self-host swap only touches this file.

const API_BASE = process.env.UMAMI_API_URL || "https://api.umami.is/v1";
const API_KEY = process.env.UMAMI_API_KEY;
const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export type AnalyticsWindow = "today" | "month" | "30d" | "all";

export type SourceCategory = "direct" | "email" | "search" | "social" | "referral";

export interface TrafficStats {
  pageviews: number;
  uniques: number; // Umami "visitors"
  sessions: number; // Umami "visits"
}

export interface Breakdown {
  label: string;
  count: number;
}

export interface UmamiTraffic {
  stats: TrafficStats;
  sources: Record<SourceCategory, number>;
  devices: Breakdown[];
}

/** True when the Umami integration is configured (env present). Lets callers degrade cleanly. */
export function isUmamiConfigured(): boolean {
  return Boolean(API_KEY && WEBSITE_ID);
}

/**
 * Resolve a window to a [startAt, endAt] range in epoch-ms.
 * `all` is clamped to ANALYTICS_START_DATE (the day tracking went live) — before that, Umami has
 * no data and dividing historical submissions by ~0 pageviews would produce garbage.
 */
export function windowRange(
  window: AnalyticsWindow,
  now: Date = new Date(),
  startFloor: Date | null = analyticsStartDate(),
): { startAt: number; endAt: number } {
  const endAt = now.getTime();
  let start: Date;
  switch (window) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "30d":
      start = new Date(endAt - 30 * 24 * 60 * 60 * 1000);
      break;
    case "all":
    default:
      start = startFloor ?? new Date(0);
      break;
  }
  if (startFloor && start.getTime() < startFloor.getTime()) {
    start = startFloor;
  }
  return { startAt: start.getTime(), endAt };
}

export function analyticsStartDate(): Date | null {
  const raw = process.env.ANALYTICS_START_DATE;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/** Map a raw referrer string to a coarse source category. */
export function normaliseReferrer(referrer: string | null | undefined): SourceCategory {
  if (!referrer || !referrer.trim()) return "direct";
  const r = referrer.toLowerCase();
  // ⚠️ T1 SPIKE follow-up: most F2K traffic is agent email, which usually arrives with NO
  // referrer (shows as `direct`) unless the link carries UTM. Real email attribution needs
  // utm_source — wire Umami query/utm metrics in the spike and fold it in here.
  if (/mail|gmail|outlook|webmail|yahoo|protonmail/.test(r)) return "email";
  if (/google|bing|duckduckgo|yahoo\.com\/search|ecosia|brave/.test(r)) return "search";
  if (/facebook|instagram|linkedin|twitter|t\.co|tiktok|youtube|reddit|fb\.com/.test(r))
    return "social";
  return "referral";
}

function emptySources(): Record<SourceCategory, number> {
  return { direct: 0, email: 0, search: 0, social: 0, referral: 0 };
}

async function umamiGet(path: string, params: Record<string, string | number>) {
  if (!isUmamiConfigured()) return null;
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  try {
    const res = await fetch(`${API_BASE}/websites/${WEBSITE_ID}${path}?${qs}`, {
      headers: { "x-umami-api-key": API_KEY as string, accept: "application/json" },
      // Next caching is layered in the adapter; keep the raw fetch uncached here.
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // degrade-don't-fake
  }
}

/**
 * Fetch traffic for one estate path over a window. Returns null on any failure (env missing,
 * network, non-200) so the dashboard can render "traffic unavailable" rather than crash.
 */
export async function fetchUmamiTraffic(
  estatePath: string,
  window: AnalyticsWindow,
): Promise<UmamiTraffic | null> {
  const { startAt, endAt } = windowRange(window);
  const base = { startAt, endAt, url: estatePath };

  const [stats, referrerMetrics, deviceMetrics] = await Promise.all([
    umamiGet("/stats", base),
    umamiGet("/metrics", { ...base, type: "referrer" }),
    umamiGet("/metrics", { ...base, type: "device" }),
  ]);

  if (!stats) return null;

  const sources = emptySources();
  if (Array.isArray(referrerMetrics)) {
    for (const row of referrerMetrics as Array<{ x: string | null; y: number }>) {
      sources[normaliseReferrer(row.x)] += Number(row.y) || 0;
    }
  }

  const devices: Breakdown[] = Array.isArray(deviceMetrics)
    ? (deviceMetrics as Array<{ x: string | null; y: number }>).map((row) => ({
        label: row.x || "unknown",
        count: Number(row.y) || 0,
      }))
    : [];

  return {
    stats: {
      pageviews: Number(stats?.pageviews?.value) || 0,
      uniques: Number(stats?.visitors?.value) || 0,
      sessions: Number(stats?.visits?.value) || 0,
    },
    sources,
    devices,
  };
}
