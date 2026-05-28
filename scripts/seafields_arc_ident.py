"""Disambiguate carriageway ARCs at a junction: draw every arc in a DISTINCT
colour with a bold matching-colour index + a dot at its midpoint, over faint
context (lots/POS/subject) and faint numbered LINEs. Crops to the two flagged
entrances so the correct arc index is unambiguous.

Same arc sort (by projected midpoint) as seafields_render_car_labeled.py, so
indices match the A# labels Dennis has been reading.
"""
import json
from importlib import import_module
from pathlib import Path

import ezdxf
from ezdxf import path as ezpath
from PIL import Image, ImageDraw, ImageFont

gen = import_module("generate-seafields-polygons")
REPO = Path(__file__).parent.parent
OUT = Path(__file__).parent / "_capprobe"
SCALE = 6.0  # higher res; we only render crops

PALETTE = [
    (220, 0, 0), (0, 130, 0), (0, 90, 230), (230, 120, 0), (170, 0, 200),
    (0, 160, 160), (200, 0, 120), (120, 90, 0), (0, 0, 0), (120, 120, 120),
]


def flat(e):
    p = ezpath.make_path(e)
    return [(v.x, v.y) for v in p.flattening(distance=0.1)]


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
        return ((x - min_x) / width_m * inner_w + PAD, (max_y - y) / height_m * inner_h + PAD)

    lines, arcs = [], []
    for e in msp:
        if e.dxf.layer != "Cad-Rd-Car":
            continue
        pts = flat(e)
        if len(pts) < 2:
            continue
        sp = [proj(x, y) for x, y in pts]
        (lines if e.dxftype() == "LINE" else arcs).append(sp)

    def midp(ps):
        return (round(sum(p[0] for p in ps) / len(ps), 1), round(sum(p[1] for p in ps) / len(ps), 1))
    lines.sort(key=midp)
    arcs.sort(key=midp)

    W, H = int(VIEW_W * SCALE), int(view_h * SCALE)
    poly = json.loads((REPO / "src" / "data" / "seafields" / "polygons.json").read_text(encoding="utf-8"))
    img = Image.new("RGB", (W, H), (252, 251, 248))
    d = ImageDraw.Draw(img)

    def fp(pts, fill, outline):
        xy = [(x * SCALE, y * SCALE) for x, y in pts]
        d.polygon(xy, fill=fill); d.line(xy + [xy[0]], fill=outline, width=2)
    for p in poly.get("parentLots", []):
        fp(p, (246, 244, 239), (228, 222, 212))
    if poly.get("subjectArea"):
        fp(poly["subjectArea"], (255, 255, 255), (220, 222, 230))
    for pts in poly["lots"].values():
        fp(pts, (246, 244, 238), (222, 218, 208))
    if poly.get("pos"):
        fp(poly["pos"], (230, 240, 220), (200, 216, 186))

    try:
        font = ImageFont.truetype("arialbd.ttf", 30)
        sfont = ImageFont.truetype("arial.ttf", 22)
    except Exception:
        font = sfont = ImageFont.load_default()

    # faint numbered lines (context)
    for i, ps in enumerate(lines):
        d.line([(x * SCALE, y * SCALE) for x, y in ps], fill=(150, 175, 210), width=3)
        mx, my = midp(ps)
        d.text((mx * SCALE - 6, my * SCALE - 9), str(i), fill=(120, 150, 195), font=sfont)

    # arcs in distinct colours + bold index + midpoint dot
    for ai, ps in enumerate(arcs):
        col = PALETTE[ai % len(PALETTE)]
        d.line([(x * SCALE, y * SCALE) for x, y in ps], fill=col, width=6)
        mx, my = midp(ps)
        r = 6
        d.ellipse((mx * SCALE - r, my * SCALE - r, mx * SCALE + r, my * SCALE + r), fill=col)
        for ox, oy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
            d.text((mx * SCALE + 8 + ox, my * SCALE - 14 + oy), f"A{ai}", fill=(255, 255, 255), font=font)
        d.text((mx * SCALE + 8, my * SCALE - 14), f"A{ai}", fill=col, font=font)

    for nm, (cx, cy, r) in {"I_arc_entrance1": (519, 472, 45), "I_arc_entrance2": (744, 350, 40)}.items():
        bx = (int((cx - r) * SCALE), int((cy - r) * SCALE), int((cx + r) * SCALE), int((cy + r) * SCALE))
        img.crop(bx).save(OUT / f"{nm}.png")
        print(f"[write] {OUT/(nm+'.png')}")


if __name__ == "__main__":
    main()
