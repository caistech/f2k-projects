"""For each red mark: show [markup-JPG crop | my realistic-render crop] at the
SAME map location, high zoom, so we SEE the exact cap line Dennis drew over and
what our render puts there. JPG<->SVG via the street-label affine fit."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).parent.parent
JPG = REPO / "docs" / "seafields_map_correction" / "dennis-corrected-4.JPG"
REAL = Path(__file__).parent / "_capprobe" / "A_realistic.png"  # 3000x2027, SCALE=3
SCALE = 3.0
SX_A, SX_B = 1.069, 102.7
SY_A, SY_B = 1.0657, -1.34

# marks: JPG-pixel centroids from the extractor
MARKS = {
    "mark0_POSbottomR": (898, 367),
    "mark1_POSbottomL": (787, 373),
    "mark2_centralJxn": (661, 509),
}
HALF = 55  # JPG px half-window


def svg_from_jpg(px, py):
    return (px - SX_B) / SX_A, (py - SY_B) / SY_A


def main():
    jpg = Image.open(JPG).convert("RGB")
    real = Image.open(REAL).convert("RGB")
    for name, (cx, cy) in MARKS.items():
        jbox = (cx - HALF, cy - HALF, cx + HALF, cy + HALF)
        jcrop = jpg.crop(jbox)
        # same map region in SVG -> realistic px
        sx0, sy0 = svg_from_jpg(cx - HALF, cy - HALF)
        sx1, sy1 = svg_from_jpg(cx + HALF, cy + HALF)
        rbox = (int(sx0 * SCALE), int(sy0 * SCALE), int(sx1 * SCALE), int(sy1 * SCALE))
        rcrop = real.crop(rbox)
        # normalise sizes, zoom 5x
        z = 5
        jcrop = jcrop.resize((HALF * 2 * z, HALF * 2 * z), Image.NEAREST)
        rcrop = rcrop.resize((jcrop.width, jcrop.height), Image.NEAREST)
        combo = Image.new("RGB", (jcrop.width * 2 + 12, jcrop.height), (255, 255, 255))
        combo.paste(jcrop, (0, 0))
        combo.paste(rcrop, (jcrop.width + 12, 0))
        out = Path(__file__).parent / "_capprobe" / f"S_{name}.png"
        combo.save(out)
        print(f"[write] {out}  (left=markup  right=our render)  SVGcentre={svg_from_jpg(cx,cy)}")


if __name__ == "__main__":
    main()
