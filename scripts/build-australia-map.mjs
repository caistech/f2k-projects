// build-australia-map.mjs
// One-off generator: turns a public-domain Australia-states GeoJSON into a small, stylised
// inline-SVG path set for the landing-page map (src/data/australia-states.json).
//
// Why a baked file: the source GeoJSON is ~637KB of full-detail cadastral coastline — far too
// heavy to ship to the browser. We Mercator-project it, Douglas-Peucker-simplify it, drop tiny
// offshore islands (keeping Tasmania + every mainland state), and emit compact SVG `d` strings
// plus the SHARED projection params so estate pins (projected at runtime from estates.ts lat/lng)
// land in exactly the same coordinate space as the polygons.
//
// Run:  node scripts/build-australia-map.mjs  (expects /tmp/au.geojson — see the curl in the PR notes)
// Source GeoJSON: codeforgermany/click_that_hood (MIT) public/data/australia.geojson

import { readFileSync, writeFileSync } from "node:fs";

const SRC = process.argv[2] || "/tmp/au.geojson";
const OUT = "src/data/australia-states.json";

const VIEW_W = 1000; // viewBox width; height derived from aspect ratio
const DP_TOLERANCE = 0.04; // Douglas-Peucker tolerance in degrees (stylised, not survey-grade)
const MIN_AREA = 0.06; // drop polygons whose |shoelace area| (deg^2) is below this (tiny islands)

const ABBR = {
  "Western Australia": "WA",
  "Northern Territory": "NT",
  "South Australia": "SA",
  Queensland: "QLD",
  "New South Wales": "NSW",
  Victoria: "VIC",
  Tasmania: "TAS",
  "Australian Capital Territory": "ACT",
};
// "Other Territories" (offshore islands) is intentionally excluded.

// ---- Web Mercator (lng/lat degrees -> planar) -------------------------------------------------
const toRad = (d) => (d * Math.PI) / 180;
function mercator(lng, lat) {
  return [toRad(lng), Math.log(Math.tan(Math.PI / 4 + toRad(lat) / 2))];
}

// ---- Douglas-Peucker on [lng,lat] rings -------------------------------------------------------
function perpDist(p, a, b) {
  const [x, y] = p, [x1, y1] = a, [x2, y2] = b;
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const px = x1 + t * dx, py = y1 + t * dy;
  return Math.hypot(x - px, y - py);
}
function douglasPeucker(pts, tol) {
  if (pts.length < 3) return pts;
  let maxD = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > tol) {
    const left = douglasPeucker(pts.slice(0, idx + 1), tol);
    const right = douglasPeucker(pts.slice(idx), tol);
    return left.slice(0, -1).concat(right);
  }
  return [pts[0], pts[pts.length - 1]];
}

// ---- shoelace area in degrees^2 (for the island-size filter) ----------------------------------
function ringArea(ring) {
  let a = 0;
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}

// Normalise any geometry into an array of outer rings ([[lng,lat],...]).
function outerRings(geom) {
  if (geom.type === "Polygon") return [geom.coordinates[0]];
  if (geom.type === "MultiPolygon") return geom.coordinates.map((poly) => poly[0]);
  return [];
}

const fc = JSON.parse(readFileSync(SRC, "utf8"));

// Pass 1: collect kept, simplified rings per state + global mercator bounds.
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
const states = [];

for (const f of fc.features) {
  const name = f.properties?.name;
  const abbr = ABBR[name];
  if (!abbr) continue; // skips "Other Territories"

  const rings = outerRings(f.geometry)
    .filter((r) => ringArea(r) >= MIN_AREA)
    .map((r) => douglasPeucker(r, DP_TOLERANCE));

  // Safety: if the filter removed everything (shouldn't for a real state), keep the largest ring.
  if (rings.length === 0) {
    const all = outerRings(f.geometry).sort((a, b) => ringArea(b) - ringArea(a));
    if (all[0]) rings.push(douglasPeucker(all[0], DP_TOLERANCE));
  }

  // Track bounds + the largest ring (for the label anchor).
  let largest = null, largestArea = -1;
  for (const r of rings) {
    for (const [lng, lat] of r) {
      const [mx, my] = mercator(lng, lat);
      if (mx < minX) minX = mx; if (mx > maxX) maxX = mx;
      if (my < minY) minY = my; if (my > maxY) maxY = my;
    }
    const ar = ringArea(r);
    if (ar > largestArea) { largestArea = ar; largest = r; }
  }
  states.push({ abbr, name, rings, largest });
}

// Pass 2: projection params (shared with runtime pin placement).
const scale = VIEW_W / (maxX - minX);
const height = (maxY - minY) * scale;
const projX = (mx) => (mx - minX) * scale;
const projY = (my) => (maxY - my) * scale; // flip: SVG y grows downward
const proj = (lng, lat) => {
  const [mx, my] = mercator(lng, lat);
  return [projX(mx), projY(my)];
};
const round = (n) => Math.round(n * 100) / 100;

// Pass 3: emit SVG `d` strings + label anchors.
const outStates = states.map(({ abbr, name, rings, largest }) => {
  const d = rings
    .map((r) => {
      const pts = r.map(([lng, lat]) => {
        const [x, y] = proj(lng, lat);
        return `${round(x)} ${round(y)}`;
      });
      return "M" + pts.join("L") + "Z";
    })
    .join(" ");
  // Label anchor = mean of the largest ring's projected vertices.
  let sx = 0, sy = 0;
  for (const [lng, lat] of largest) { const [x, y] = proj(lng, lat); sx += x; sy += y; }
  const cx = round(sx / largest.length), cy = round(sy / largest.length);
  return { abbr, name, d, cx, cy };
});

const out = {
  width: VIEW_W,
  height: round(height),
  // Runtime pin projection: mercator(lng,lat) -> [(mx-minX)*scale, (maxY-my)*scale]
  proj: { minX, maxY, scale },
  states: outStates,
};

writeFileSync(OUT, JSON.stringify(out));
const kb = (JSON.stringify(out).length / 1024).toFixed(1);
console.log(`Wrote ${OUT} (${kb}KB) · viewBox 0 0 ${VIEW_W} ${out.height}`);
for (const s of outStates) console.log(`  ${s.abbr.padEnd(4)} d=${s.d.length}b label=(${s.cx},${s.cy})`);
