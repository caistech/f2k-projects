// Process the Joey ADU colour-scheme renders for the public Seafields design gallery.
//
// Source renders (docs/RENDERs) are ~1.7MB PNGs at 1556x672. Scheme 02 has a
// "UNISON MODULAR — RENDER GENERATOR PROMPT" title bar burned across the top that
// MUST be removed before the image is public (de-branding rule, Uwe 2026-06-15).
//
// This script crops Scheme 02's top bar, then resizes + JPEG-compresses all four
// schemes into public/seafields/designs/joey/ (renders compress far better as JPEG
// than PNG — matches the Branscombe elevation .jpeg convention). Re-runnable.
//
// Usage:
//   node scripts/process-joey-renders.mjs [--s02-top <fraction|px>]

import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "docs/RENDERs/RENDERs";
const OUT = "public/seafields/designs/joey";
const WIDTH = 1400;
const QUALITY = 82;

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i === -1 || i + 1 >= process.argv.length ? def : process.argv[i + 1];
}

// Crop fraction (or "NNpx") off the TOP of Scheme 02 to remove the branding bar.
const s02Top = arg("--s02-top", "0.13");

const JOBS = [
  {
    name: "charcoal",
    src: `${SRC}/SCHEME 01 MONOCHROMATIC CHARCOAL/SCHEME 01 MONOCHROMATIC CHARCOAL.png`,
    cropTop: 0,
  },
  {
    name: "mineral-grey",
    src: `${SRC}/SCHEME 02 URBAN MINERAL GREY THEME/SCHEME 02 MINERAL GREY THEME.png`,
    cropTop: s02Top, // <-- removes the UNISON title bar
  },
  {
    name: "coastal",
    src: `${SRC}/SCHEME 03 COASTAL SURFMIST OFF-WHITE THEME/SCHEME 03 COASTAL SURFMIST OFF-WHITE THEME.png`,
    cropTop: 0,
  },
  {
    name: "contemporary-greys",
    src: `${SRC}/SCHEME 04 MULTI-TEXTURED CONTEMPORARY GREYS/SCHEME 04 MULTI-TEXTURED CONTEMPORARY GREYS.png`,
    cropTop: 0,
  },
];

function resolvePx(value, total) {
  const s = String(value);
  if (s === "0") return 0;
  if (s.endsWith("px")) return Math.round(parseFloat(s));
  return Math.round(parseFloat(s) * total);
}

await mkdir(OUT, { recursive: true });

for (const job of JOBS) {
  const meta = await sharp(job.src).metadata();
  const top = resolvePx(job.cropTop, meta.height);
  let pipe = sharp(job.src);
  if (top > 0) {
    pipe = pipe.extract({
      left: 0,
      top,
      width: meta.width,
      height: meta.height - top,
    });
  }
  const outPath = `${OUT}/${job.name}.jpg`;
  await pipe
    .resize({ width: WIDTH, withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(outPath);
  console.log(
    `${job.name}: ${meta.width}x${meta.height}${top ? ` (top -${top}px)` : ""} -> ${outPath}`,
  );
}
console.log("done");
