// australia-map.ts — runtime helpers for the landing-page Australia SVG map.
//
// The state polygons in src/data/australia-states.json were Mercator-projected at build time
// (scripts/build-australia-map.mjs). This re-applies the SAME projection so estate lat/lng pins
// land in exactly the same coordinate space as the baked polygons — one projection, no drift.

import australia from "@/data/australia-states.json";

export interface AustraliaMapData {
  width: number;
  height: number;
  proj: { minX: number; maxY: number; scale: number };
  states: { abbr: string; name: string; d: string; cx: number; cy: number }[];
}

export const AUSTRALIA = australia as AustraliaMapData;

const toRad = (d: number) => (d * Math.PI) / 180;

/** Project a lng/lat into the map's SVG viewBox coordinate space (Web Mercator, build-matched). */
export function projectLngLat(lng: number, lat: number): { x: number; y: number } {
  const { minX, maxY, scale } = AUSTRALIA.proj;
  const mx = toRad(lng);
  const my = Math.log(Math.tan(Math.PI / 4 + toRad(lat) / 2));
  return { x: (mx - minX) * scale, y: (maxY - my) * scale };
}
