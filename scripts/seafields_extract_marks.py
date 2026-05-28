"""Extract Dennis's red marks from dennis-corrected-4.JPG, cluster them, and
map each cluster centroid from JPG pixels -> polygons.json SVG coords using a
street-label affine fit. Prints SVG bboxes ready to feed the layer probe.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).parent.parent
JPG = REPO / "docs" / "seafields_map_correction" / "dennis-corrected-4.JPG"

# --- JPG->SVG affine (scale+translate), fit from street labels common to both.
#  SVG label coords come from polygons.json; JPG coords read off the markup.
#  COLLINS  SVG(602.73,19.09)  JPG(747,19)
#  HALFMOON SVG(600.43,596.19) JPG(746,634)
#  DAVID    SVG(106.02,635.12) JPG(216,676)
#  POND     SVG(814.26,350.18) JPG(975,372)
SX_A, SX_B = 1.069, 102.7   # JPG_x = SVG_x*SX_A + SX_B
SY_A, SY_B = 1.0657, -1.34  # JPG_y = SVG_y*SY_A + SY_B


def jpg_to_svg(px, py):
    return (px - SX_B) / SX_A, (py - SY_B) / SY_A


def main():
    im = np.asarray(Image.open(JPG).convert("RGB")).astype(int)
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    # "red" = strong R, weak G/B
    red = (R > 150) & (G < 110) & (B < 110) & (R - G > 70) & (R - B > 70)
    ys, xs = np.where(red)
    print(f"[red px] {len(xs)} pixels; img {im.shape[1]}x{im.shape[0]}")
    if len(xs) == 0:
        return
    # simple grid clustering: bucket by 30px, then merge adjacent buckets
    pts = list(zip(xs.tolist(), ys.tolist()))
    clusters = []
    GAP = 35
    for x, y in pts:
        placed = False
        for c in clusters:
            if abs(x - c["cx"]) <= GAP and abs(y - c["cy"]) <= GAP:
                c["xs"].append(x); c["ys"].append(y)
                c["cx"] = sum(c["xs"]) / len(c["xs"])
                c["cy"] = sum(c["ys"]) / len(c["ys"])
                placed = True
                break
        if not placed:
            clusters.append({"xs": [x], "ys": [y], "cx": x, "cy": y})
    clusters = [c for c in clusters if len(c["xs"]) >= 15]
    print(f"[clusters] {len(clusters)} (>=15 px)")
    for i, c in enumerate(clusters):
        x0, x1 = min(c["xs"]), max(c["xs"])
        y0, y1 = min(c["ys"]), max(c["ys"])
        sx0, sy0 = jpg_to_svg(x0, y0)
        sx1, sy1 = jpg_to_svg(x1, y1)
        scx, scy = jpg_to_svg(c["cx"], c["cy"])
        print(f"\n  mark {i}: {len(c['xs'])}px  JPG centroid=({c['cx']:.0f},{c['cy']:.0f})  "
              f"JPG bbox=({x0},{y0})-({x1},{y1})")
        print(f"    -> SVG centroid=({scx:.1f},{scy:.1f})  SVG bbox=({sx0:.1f},{sy0:.1f})-({sx1:.1f},{sy1:.1f})")
        print(f"    probe: python scripts/seafields_cap_layer_probe.py "
              f"{min(sx0,sx1):.0f} {min(sy0,sy1):.0f} {max(sx0,sx1):.0f} {max(sy0,sy1):.0f}")


if __name__ == "__main__":
    main()
