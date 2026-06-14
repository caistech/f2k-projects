// Crop manufacturer branding off a Seafields design drawing (PNG).
//
// Uwe 2026-06-15: "crop all drawings so the manufacturer cannot be seen" — the
// floor-plan title blocks carry the manufacturer's logo/firm (e.g. MWH / Modular
// WA / Unison Modular). F2K's own marks (WABI DESIGN, Factory2Key) are kept.
//
// This is a calibration tool, not a one-shot: branding sits in a different place
// on each drawing, so review every output before it goes live. Margins are a
// fraction (0–1) of the dimension to remove from each edge.
//
// Usage:
//   node scripts/crop-design-plan.mjs <in.png> <out.png> --right 0.135 --bottom 0.10
//   node scripts/crop-design-plan.mjs in.png out.png --right 120px --top 0.05
//
// A value ending in "px" is absolute pixels; otherwise it's a fraction of the
// width (left/right) or height (top/bottom).

import sharp from "sharp";

function arg(flag, def = 0) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return def;
  return process.argv[i + 1];
}

function resolve(value, total) {
  if (value === 0 || value === "0") return 0;
  const s = String(value);
  if (s.endsWith("px")) return Math.round(parseFloat(s));
  return Math.round(parseFloat(s) * total);
}

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error(
    "usage: node scripts/crop-design-plan.mjs <in.png> <out.png> [--left f] [--right f] [--top f] [--bottom f]",
  );
  process.exit(1);
}

const img = sharp(input);
const meta = await img.metadata();
const left = resolve(arg("--left", 0), meta.width);
const right = resolve(arg("--right", 0), meta.width);
const top = resolve(arg("--top", 0), meta.height);
const bottom = resolve(arg("--bottom", 0), meta.height);

const width = meta.width - left - right;
const height = meta.height - top - bottom;
if (width <= 0 || height <= 0) {
  console.error("crop leaves no image — reduce the margins");
  process.exit(1);
}

await sharp(input)
  .extract({ left, top, width, height })
  .toFile(output);

console.log(
  `cropped ${input} (${meta.width}x${meta.height}) -> ${output} (${width}x${height})  [L${left} R${right} T${top} B${bottom}]`,
);
