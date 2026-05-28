"""Empirical removal test for the cap blocker. For a mark SVG centroid:
  1. find roads/roadReserves segments within RADIUS metres,
  2. render the realistic crop BEFORE and AFTER deleting them,
  3. pixel-diff -> prove whether deletion changes pixels (memory hypothesis #1),
  4. emit a 3-up [before | after | diff(thick red)] zoomed crop.

unitsPerMetre converts metres<->SVG units. Prints the matched segment indices
in the SAME combined-index scheme the prior session used so the result is
directly actionable on polygons.json.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).parent.parent
POLY = json.loads((REPO / "src" / "data" / "seafields" / "polygons.json").read_text(encoding="utf-8"))
OUT = Path(__file__).parent / "_capprobe"
SCALE = 3.0
VW, VH = POLY["viewWidth"], POLY["viewHeight"]
W, H = int(VW * SCALE), int(VH * SCALE)
UPM = POLY["unitsPerMetre"]


def sx(x): return x * SCALE
def sy(y): return y * SCALE


def seg_dist_to_pt(seg, p):
    (x1, y1), (x2, y2) = seg
    px, py = p
    dx, dy = x2 - x1, y2 - y1
    L2 = dx * dx + dy * dy
    if L2 == 0:
        return ((px - x1) ** 2 + (py - y1) ** 2) ** 0.5
    t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / L2))
    cx, cy = x1 + t * dx, y1 + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def render(remove_roads=set(), remove_rr=set()):
    img = Image.new("RGB", (W, H), (250, 248, 244))
    d = ImageDraw.Draw(img)
    for p in POLY["parentLots"]:
        d.polygon([(sx(a), sy(b)) for a, b in p], fill=(240, 237, 230))
        d.line([(sx(a), sy(b)) for a, b in p] + [(sx(p[0][0]), sy(p[0][1]))], fill=(212, 204, 184), width=1)
    if POLY.get("subjectArea"):
        sa = POLY["subjectArea"]
        d.polygon([(sx(a), sy(b)) for a, b in sa], fill=(255, 255, 255))
        d.line([(sx(a), sy(b)) for a, b in sa] + [(sx(sa[0][0]), sy(sa[0][1]))], fill=(26, 39, 68), width=max(1, int(1.2 * SCALE)))
    if POLY.get("pos"):
        ps = POLY["pos"]
        d.polygon([(sx(a), sy(b)) for a, b in ps], fill=(184, 217, 155))
        d.line([(sx(a), sy(b)) for a, b in ps] + [(sx(ps[0][0]), sy(ps[0][1]))], fill=(107, 155, 74), width=max(1, int(0.8 * SCALE)))
    for i, s in enumerate(POLY["roadReserves"]):
        if i in remove_rr:
            continue
        d.line([(sx(s[0][0]), sy(s[0][1])), (sx(s[1][0]), sy(s[1][1]))], fill=(229, 225, 216), width=max(1, int(0.4 * SCALE)))
    for i, s in enumerate(POLY["roads"]):
        if i in remove_roads:
            continue
        d.line([(sx(s[0][0]), sy(s[0][1])), (sx(s[1][0]), sy(s[1][1]))], fill=(184, 176, 160), width=max(1, int(0.6 * SCALE)))
    for pts in POLY["lots"].values():
        d.polygon([(sx(a), sy(b)) for a, b in pts], fill=(232, 226, 212))
        d.line([(sx(a), sy(b)) for a, b in pts] + [(sx(pts[0][0]), sy(pts[0][1]))], fill=(153, 153, 153), width=max(1, int(0.4 * SCALE)))
    return img


def main():
    cx, cy, radius_m = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3])
    rad = radius_m * UPM
    nr = {i for i, s in enumerate(POLY["roads"]) if seg_dist_to_pt(s, (cx, cy)) <= rad}
    nrr = {i for i, s in enumerate(POLY["roadReserves"]) if seg_dist_to_pt(s, (cx, cy)) <= rad}
    print(f"mark ({cx},{cy}) r={radius_m}m ({rad:.1f}u): roads={sorted(nr)} roadReserves={sorted(nrr)}")
    print(f"  combined-index (RR first, len(RR)={len(POLY['roadReserves'])}): "
          f"{sorted(list(nrr) + [i + len(POLY['roadReserves']) for i in nr])}")

    before = render()
    after = render(remove_roads=nr, remove_rr=nrr)
    ba = np.asarray(before).astype(int)
    aa = np.asarray(after).astype(int)
    diff = (np.abs(ba - aa).sum(axis=2) > 20)
    print(f"  changed pixels: {int(diff.sum())}")

    # crop window around the mark
    pad = int(radius_m * UPM * SCALE) + 60
    box = (int(sx(cx) - pad), int(sy(cy) - pad), int(sx(cx) + pad), int(sy(cy) + pad))
    bc = before.crop(box); ac = after.crop(box)
    dc = before.crop(box).copy()
    dd = ImageDraw.Draw(dc)
    # paint diff pixels thick red on a copy of before
    dca = np.asarray(dc).copy()
    dsub = diff[box[1]:box[3], box[0]:box[2]]
    dca[dsub] = [255, 0, 0]
    dc = Image.fromarray(dca)
    z = 4
    bc = bc.resize((bc.width * z, bc.height * z), Image.NEAREST)
    ac = ac.resize((ac.width * z, ac.height * z), Image.NEAREST)
    dc = dc.resize((dc.width * z, dc.height * z), Image.NEAREST)
    combo = Image.new("RGB", (bc.width * 3 + 24, bc.height + 28), (255, 255, 255))
    cd = ImageDraw.Draw(combo)
    try:
        font = ImageFont.truetype("arial.ttf", 22)
    except Exception:
        font = ImageFont.load_default()
    for i, (lbl, im) in enumerate([("BEFORE", bc), ("AFTER(del roads+RR)", ac), ("DIFF(red=changed)", dc)]):
        x = i * (bc.width + 12)
        combo.paste(im, (x, 24))
        cd.text((x + 4, 2), lbl, fill=(180, 0, 0), font=font)
    name = OUT / f"E_removaldiff_{int(cx)}_{int(cy)}_r{int(radius_m)}.png"
    combo.save(name)
    print(f"[write] {name}")


if __name__ == "__main__":
    main()
