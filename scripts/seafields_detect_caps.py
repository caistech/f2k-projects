"""Detect carriageway 'cap' lines = Cad-Rd-Car LINE entities whose BOTH endpoints
coincide with kerb-return ARC endpoints (i.e. bracketed by returns on both ends).
Removing these (keeping the arcs) opens each road mouth with rounded corners kept.

Excludes cul-de-sac heads: a cap candidate is rejected if the two arcs at its
ends curve back toward each other (a bulb) rather than flaring apart (a mouth).
Heuristic: at a real mouth the two bracketing arcs' far endpoints are WIDER apart
than the cap's own endpoints; at a cul-de-sac bulb they are NARROWER (they close).

Outputs F_caps.json (DWG endpoint coords of caps) + F_caps_render.png
(caps RED, kept LINEs blue, arcs green) for review.
"""
import json
import math
from importlib import import_module
from pathlib import Path

import ezdxf
from ezdxf import path as ezpath
from PIL import Image, ImageDraw, ImageFont

gen = import_module("generate-seafields-polygons")
OUT = Path(__file__).parent / "_capprobe"
SCALE = 3.0
TOL = 1.0  # metres, endpoint coincidence


def flat(e):
    p = ezpath.make_path(e)
    return [(v.x, v.y) for v in p.flattening(distance=0.1)]


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def main():
    oda = gen.find_oda()
    dxf = gen.dwg_to_dxf(gen.DWG_INPUT, oda)
    doc = ezdxf.readfile(dxf)
    msp = doc.modelspace()

    subj = gen.collect_polys(msp, "G-Bndy Subject Area")[0]
    xs = [p[0] for p in subj]; ys = [p[1] for p in subj]
    min_x, max_x = min(xs), max(xs); min_y, max_y = min(ys), max(ys)
    width_m = max_x - min_x; height_m = max_y - min_y
    VIEW_W, PAD = gen.VIEW_W, gen.PAD
    inner_w = VIEW_W - 2 * PAD
    inner_h = inner_w * (height_m / width_m)
    view_h = inner_h + 2 * PAD

    def proj(x, y):
        return (round((x - min_x) / width_m * inner_w + PAD, 2),
                round((max_y - y) / height_m * inner_h + PAD, 2))

    lines, arcs = [], []
    for e in msp:
        if e.dxf.layer != "Cad-Rd-Car":
            continue
        pts = flat(e)
        if len(pts) < 2:
            continue
        if e.dxftype() == "LINE":
            lines.append({"a": pts[0], "b": pts[-1], "pts": pts,
                          "len": dist(pts[0], pts[-1])})
        else:
            arcs.append({"a": pts[0], "b": pts[-1], "pts": pts})
    # sort by projected midpoint to match F_car_lines indices
    def midproj(o):
        mx, my = (o["a"][0] + o["b"][0]) / 2, (o["a"][1] + o["b"][1]) / 2
        px, py = proj(mx, my)
        return (round(px, 1), round(py, 1))
    lines.sort(key=midproj)

    arc_ends = []
    for ar in arcs:
        arc_ends.append(ar["a"]); arc_ends.append(ar["b"])

    def arc_touching(pt):
        """return the arc (and which end's far point) touching pt, else None."""
        best = None
        for ar in arcs:
            for end, far in ((ar["a"], ar["b"]), (ar["b"], ar["a"])):
                if dist(pt, end) <= TOL:
                    return ar, far
        return None

    caps = []
    for i, ln in enumerate(lines):
        ta = arc_touching(ln["a"])
        tb = arc_touching(ln["b"])
        if not (ta and tb):
            continue
        # cul-de-sac bulb exclusion: if the arcs' far endpoints are CLOSER
        # together than the line's own endpoints, the arcs close a bulb (keep).
        far_gap = dist(ta[1], tb[1])
        own_gap = dist(ln["a"], ln["b"])
        is_bulb = far_gap < own_gap * 0.9
        caps.append({"i": i, "a": ln["a"], "b": ln["b"], "len": round(ln["len"], 2),
                     "svg": [list(proj(*ln["a"])), list(proj(*ln["b"]))],
                     "far_gap": round(far_gap, 1), "own_gap": round(own_gap, 1),
                     "is_bulb": is_bulb})

    keep_caps = [c for c in caps if not c["is_bulb"]]
    print(f"lines={len(lines)} arcs={len(arcs)}")
    print(f"arc-bracketed lines={len(caps)}; after bulb-exclusion={len(keep_caps)}")
    for c in caps:
        flag = "BULB(keep)" if c["is_bulb"] else "CAP"
        print(f"  i={c['i']:>2} len={c['len']:>6}m svg_mid=({(c['svg'][0][0]+c['svg'][1][0])/2:.0f},"
              f"{(c['svg'][0][1]+c['svg'][1][1])/2:.0f}) far_gap={c['far_gap']} own_gap={c['own_gap']} -> {flag}")

    (OUT / "F_caps.json").write_text(json.dumps(keep_caps, indent=1))

    # render
    W, H = int(VIEW_W * SCALE), int(view_h * SCALE)
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    for ar in arcs:
        d.line([(x * SCALE, y * SCALE) for x, y in [proj(*p) for p in ar["pts"]]], fill=(0, 160, 0), width=3)
    capset = {c["i"] for c in keep_caps}
    for i, ln in enumerate(lines):
        ps = [(x * SCALE, y * SCALE) for x, y in [proj(*ln["a"]), proj(*ln["b"])]]
        if i in capset:
            d.line(ps, fill=(230, 0, 0), width=5)
        else:
            d.line(ps, fill=(0, 70, 220), width=2)
    img.save(OUT / "F_caps_render.png")
    print(f"[write] {OUT/'F_caps_render.png'}  caps drawn RED")


if __name__ == "__main__":
    main()
