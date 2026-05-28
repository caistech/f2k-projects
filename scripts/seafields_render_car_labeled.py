"""Render the Cad-Rd-Car carriageway in SVG projection with each LINE labelled
by a STABLE index and ARCs (kerb returns, to KEEP) drawn in green. Lets us
identify the 'cap' LINEs by eye + matched coords. Also dumps a JSON of every
LINE's projected midpoint + endpoints so caps can be matched by coordinate.

Stable index = entities sorted by (round(xmid,1), round(ymid,1)).
"""
import json
import sys
from importlib import import_module
from pathlib import Path

import ezdxf
from ezdxf import path as ezpath
from PIL import Image, ImageDraw, ImageFont

gen = import_module("generate-seafields-polygons")
REPO = Path(__file__).parent.parent
OUT = Path(__file__).parent / "_capprobe"
OUT.mkdir(exist_ok=True)
SCALE = 3.0
# argv: integers = LINE indices to treat as DELETED; the word "arcs" = also
# label every ARC with an A-prefixed index (output -> F_car_labeled_3.png).
LABEL_ARCS = "arcs" in sys.argv[1:]
STREETS = "streets" in sys.argv[1:]
EXCLUDE = set(int(a) for a in sys.argv[1:] if a.lstrip("-").isdigit())
ARC_EXCLUDE = set(int(a[1:]) for a in sys.argv[1:] if a[:1].lower() == "a" and a[1:].isdigit())
# street-name labels to DELETE from the map (case-insensitive match)
STREET_DELETE = {"PEPPER GATE", "PIRROTINA LINK", "HALF MOON DRIVE"}


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
    aspect = height_m / width_m
    inner_h = inner_w * aspect
    view_h = inner_h + 2 * PAD

    def proj(x, y):
        return (round((x - min_x) / width_m * inner_w + PAD, 2),
                round((max_y - y) / height_m * inner_h + PAD, 2))

    W, H = int(VIEW_W * SCALE), int(view_h * SCALE)

    lines, arcs = [], []
    for e in msp:
        if e.dxf.layer != "Cad-Rd-Car":
            continue
        pts = flat(e)
        if len(pts) < 2:
            continue
        proj_pts = [proj(x, y) for x, y in pts]
        if e.dxftype() == "LINE":
            lines.append({"dwg": pts, "svg": proj_pts})
        else:
            arcs.append({"dwg": pts, "svg": proj_pts})

    # stable sort lines by midpoint
    def mid(o):
        ps = o["svg"]; return (round(sum(p[0] for p in ps) / len(ps), 1), round(sum(p[1] for p in ps) / len(ps), 1))
    lines.sort(key=mid)

    # Base = context polygons ONLY (lots / POS / subject), faded. Crucially we
    # do NOT draw the carriageway in the base — the only road lines on the image
    # are the blue overlay below, so EXCLUDEd lines genuinely disappear.
    poly = json.loads((REPO / "src" / "data" / "seafields" / "polygons.json").read_text(encoding="utf-8"))
    img = Image.new("RGB", (W, H), (250, 248, 244))
    d = ImageDraw.Draw(img)

    def fill_poly(pts, fill, outline):
        xy = [(x * SCALE, y * SCALE) for x, y in pts]
        d.polygon(xy, fill=fill)
        d.line(xy + [xy[0]], fill=outline, width=2)

    for p in poly.get("parentLots", []):
        fill_poly(p, (244, 242, 236), (224, 218, 206))
    if poly.get("subjectArea"):
        fill_poly(poly["subjectArea"], (255, 255, 255), (210, 214, 224))
    for pts in poly["lots"].values():
        fill_poly(pts, (243, 240, 233), (210, 206, 196))
    if poly.get("pos"):
        fill_poly(poly["pos"], (224, 236, 212), (190, 210, 175))
    try:
        font = ImageFont.truetype("arialbd.ttf", 22)
    except Exception:
        font = ImageFont.load_default()
    def label(mx, my, s, col):
        for ox, oy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
            d.text((mx + ox, my + oy), s, fill=(255, 255, 255), font=font)
        d.text((mx, my), s, fill=col, font=font)

    # arcs = green (kerb returns); sorted + A-labelled so curved entrances can
    # be named. arc dump (DWG coords) lets us exclude an arc by coordinate.
    def arc_mid(o):
        ps = o["svg"]
        return (round(sum(p[0] for p in ps) / len(ps), 1), round(sum(p[1] for p in ps) / len(ps), 1))
    arcs.sort(key=arc_mid)
    arc_dump = []
    for ai, a in enumerate(arcs):
        ps = [(x * SCALE, y * SCALE) for x, y in a["svg"]]
        amx, amy = arc_mid(a)
        if ai not in ARC_EXCLUDE:
            d.line(ps, fill=(0, 150, 0), width=4)
            if LABEL_ARCS:
                label(amx * SCALE + 4, amy * SCALE + 3, f"A{ai}", (150, 0, 160))
        arc_dump.append({"a": ai, "svg_mid": [amx, amy],
                         "dwg": [[round(p[0], 3), round(p[1], 3)] for p in a["dwg"]]})
    dump = []
    for i, ln in enumerate(lines):
        ps = [(x * SCALE, y * SCALE) for x, y in ln["svg"]]
        if i not in EXCLUDE:
            d.line(ps, fill=(0, 70, 220), width=4)
            mx = sum(p[0] for p in ps) / 2; my = sum(p[1] for p in ps) / 2
            label(mx - 8, my - 11, str(i), (200, 0, 0))
        else:
            mx = sum(p[0] for p in ps) / 2; my = sum(p[1] for p in ps) / 2
        (sx0, sy0), (sx1, sy1) = ln["svg"][0], ln["svg"][-1]
        length = (((ln["dwg"][0][0] - ln["dwg"][-1][0]) ** 2 + (ln["dwg"][0][1] - ln["dwg"][-1][1]) ** 2) ** 0.5)
        dump.append({"i": i, "svg": [[sx0, sy0], [sx1, sy1]], "len_m": round(length, 2),
                     "mid_svg": [round(mx / SCALE, 1), round(my / SCALE, 1)],
                     "dwg": [[round(ln["dwg"][0][0], 3), round(ln["dwg"][0][1], 3)],
                             [round(ln["dwg"][-1][0], 3), round(ln["dwg"][-1][1], 3)]]})
    # Street-name labels (real text from polygons.json), drawn with the
    # STREET_DELETE set removed. Kept names render in navy at their rotation.
    if STREETS:
        try:
            sfont = ImageFont.truetype("arialbd.ttf", 26)
        except Exception:
            sfont = ImageFont.load_default()
        for s in poly.get("streetLabels", []):
            if s["text"].strip().upper() in STREET_DELETE:
                continue
            tx, ty = s["x"] * SCALE, s["y"] * SCALE
            txt = s["text"]
            # halo for legibility
            for ox, oy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
                d.text((tx + ox, ty + oy), txt, fill=(255, 255, 255), font=sfont, anchor="mm")
            d.text((tx, ty), txt, fill=(26, 39, 68), font=sfont, anchor="mm")

    if STREETS:
        outname = "F_car_labeled_5.png"
    elif ARC_EXCLUDE:
        outname = "F_car_labeled_4.png"
    elif LABEL_ARCS:
        outname = "F_car_labeled_3.png"
    elif EXCLUDE:
        outname = "F_car_labeled_2.png"
    else:
        outname = "F_car_labeled.png"
    img.save(OUT / outname)
    if not EXCLUDE and not LABEL_ARCS:
        (OUT / "F_car_arcs.json").write_text(json.dumps(arc_dump, indent=1))
        (OUT / "F_car_lines.json").write_text(json.dumps(dump, indent=1))
        for nm, (cx, cy) in {"L_markedL": (640, 351), "L_markedR": (744, 346), "L_central": (522, 479)}.items():
            pad = 70
            bx = (int(cx * SCALE - pad * SCALE), int(cy * SCALE - pad * SCALE),
                  int(cx * SCALE + pad * SCALE), int(cy * SCALE + pad * SCALE))
            crop = img.crop(bx).resize((pad * 4 * 2, pad * 4 * 2), Image.LANCZOS)
            crop.save(OUT / f"{nm}.png")
    print(f"[write] {OUT/outname} {W}x{H}  lines={len(lines)} arcs={len(arcs)} excluded={sorted(EXCLUDE)}")


if __name__ == "__main__":
    main()
