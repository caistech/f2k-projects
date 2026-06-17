// dutton-parcel.ts — the Dutton Terrace parcel outline drawn on the satellite map.
//
// ⚠ INDICATIVE, NOT SURVEYED. The exact boundary of Allotment 50, Deposited Plan 90582 lives in
// South Australia's cadastre, which is token-gated ("not open data" — it must be requested from
// Land Services SA; the public SAPPA viewer reaches it only via a server-side token). Until the
// real DP geometry is in hand, this is an AREA-ACCURATE (~6.31 ha) schematic centred on the
// geocoded site, drawn DASHED + labelled "indicative" so it never reads as a surveyed line.
//
// SHAPE (updated 2026-06-17 per Harris RE / Rachel Hawkins' georeferenced aerial): the real
// allotment is a WIDE rectangle — long axis ≈ E-W, ~2.3:1, road along the south edge, the Tumby
// Bay oval to the north-east — NOT the square the first pass drew. The ring below matches that
// footprint (380.8 m E-W × 165.6 m N-S = 6.306 ha) so the outline reads as the actual block.
//
// TO REPLACE WITH THE REAL BOUNDARY (a one-file change): flip `indicative` to false and replace
// `ring` with the DP 90582 polygon (closed ring of [lng, lat] pairs). The map framing + rendering
// pick it up automatically. Source it from the DP or a georeferenced site plan (developer / LSSA).

export interface ParcelOutline {
  /** True while this is the schematic area box, not the surveyed DP boundary. Drives the dashed
   *  styling + the "indicative" caption — keep it true until a real DP polygon replaces `ring`. */
  indicative: boolean;
  /** Parcel area in hectares (per the proposal: Allotment 50 DP 90582 ≈ 6.306 ha). */
  areaHa: number;
  /** Geocoded site centre — also the static map's centre, so the box sits mid-frame. */
  center: { lat: number; lng: number };
  /** Closed ring of [lng, lat] pairs (last == first). */
  ring: [number, number][];
}

// Box maths: a wide 6.306 ha rectangle at ~2.3:1 is 380.8 m (E-W) × 165.6 m (N-S) — half-extents
// 190.4 m and 82.8 m. Converted to degrees at the site latitude (−34.38°, where 1° lng ≈ 91,895 m
// and 1° lat ≈ 110,574 m): ±0.002072° lng, ±0.000749° lat about the centre. Rounded to 6 dp
// (~0.1 m), far finer than the "indicative" claim needs. Long axis E-W to match the real block.
//
// CENTROID (corrected 2026-06-17, verified against the live satellite tile): the raw geocode of
// "Dutton Terrace" landed ON the street (−34.380017), which is the allotment's SOUTHERN frontage —
// so the centroid is ~83 m NORTH of it at lat −34.379268. With this centre the rectangle's south
// edge runs along Dutton Tce, the north edge along Church St, Thuruna Rd to the W and Trezise St to
// the E — i.e. the cleared paddock Rachel (Harris RE) circled. (Verified via docs/Dutton_terrace
// overlay renders; geocode-on-road was the bug behind the first square sitting half on farmland.)
export const DUTTON_PARCEL: ParcelOutline = {
  indicative: true,
  areaHa: 6.31,
  center: { lat: -34.379268, lng: 136.095408 },
  ring: [
    [136.093336, -34.380017], // SW (on Dutton Tce)
    [136.097480, -34.380017], // SE (on Dutton Tce)
    [136.097480, -34.378519], // NE (toward Church St)
    [136.093336, -34.378519], // NW (toward Church St)
    [136.093336, -34.380017], // close
  ],
};
