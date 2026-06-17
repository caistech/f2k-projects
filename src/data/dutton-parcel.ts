// dutton-parcel.ts — the Dutton Terrace parcel outline drawn on the satellite map.
//
// ⚠ INDICATIVE, NOT SURVEYED. The exact boundary of Allotment 50, Deposited Plan 90582 lives in
// South Australia's cadastre, which is token-gated ("not open data" — it must be requested from
// Land Services SA; the public SAPPA viewer reaches it only via a server-side token). Until the
// real DP geometry is in hand, this is an AREA-ACCURATE (~6.31 ha) schematic centred on the
// geocoded site, drawn DASHED + labelled "indicative" so it never reads as a surveyed line.
//
// SHAPE (traced 2026-06-17 from Harris RE / Rachel Hawkins' supplied aerial): the real allotment is
// a wide block ~381 m × ~166 m (≈6.3 ha) that is NOT axis-aligned — it is rotated ~3.5° (the long
// axis dips south going east, matching the Dutton Tce / Church St street grid) and its NE corner is
// CLIPPED (the top edge runs ~92% east, then a small notch down to the east edge near Trezise St).
// Her dashed outline was colour-extracted (docs/Dutton_terrace tooling), reduced to corners, mapped
// onto the verified ground envelope, and the result re-rendered over the satellite tile to confirm
// it tracks Dutton Tce (S), Church St (N), Thuruna Rd (W) and Trezise St (E) — i.e. her exact block.
// Still INDICATIVE (her source is an aerial trace, not the surveyed DP) → stays dashed + labelled.
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

// Geometry: built about the parcel centroid (136.095408, −34.379268) — the raw "Dutton Terrace"
// geocode landed ON the street (−34.380017 = the south frontage), so the centroid sits ~83 m north.
// Half-extents 190.4 m (long) × 82.8 m (short); local scale 1° lng ≈ 91,895 m, 1° lat ≈ 110,574 m.
// The long axis is rotated 3.5° (dips south going east) and the NE corner is clipped — the 6 ring
// points are SW → SE → E(clip) → NE-top → NW → close. Rounded to 6 dp (~0.1 m). The polygon was
// re-rendered over the satellite tile and matches Rachel's traced outline (south edge on Dutton Tce,
// north below Church St, Thuruna Rd W, Trezise St E, small notch at the NE near Trezise).
export const DUTTON_PARCEL: ParcelOutline = {
  indicative: true,
  areaHa: 6.31,
  center: { lat: -34.379268, lng: 136.095408 },
  ring: [
    [136.093285, -34.379910], // SW (on Dutton Tce, west)
    [136.097421, -34.380121], // SE (on Dutton Tce, east)
    [136.097493, -34.379149], // E  (east edge — clipped NE corner)
    [136.097366, -34.378617], // NE-top (top edge, ~92% east before the notch)
    [136.093395, -34.378415], // NW (below Church St)
    [136.093285, -34.379910], // close
  ],
};
