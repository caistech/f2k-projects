"""DEBUG PROBE (not committed) — identify which polygons.json layer draws the
visible "entrance cap" lines Dennis marked in docs/seafields_map_correction/
dennis-corrected-4.JPG.

Renders two full images at the SVG viewBox scale:
  A) realistic  — mimics PlanView.tsx (grey lot fills, light RR, tan roads,
                  green POS, navy subject outline, street labels) so it should
                  look like the markup's base render.
  B) layered    — every geometry layer in a DISTINCT bright colour on white,
                  no fills, so each line is visible and colour-coded.

Then for any crop regions passed on the cmdline it renders per-layer ISOLATED
crops (roads-only / roadReserves-only / lot-edges-only / pos+subject-only) so
we can see exactly which layer owns a given cap.

Usage:
  python scripts/seafields_cap_layer_probe.py              # full A + B
  python scripts/seafields_cap_layer_probe.py X0 Y0 X1 Y1  # + isolated crops of that SVG bbox
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).parent.parent
POLY = json.loads((REPO / "src" / "data" / "seafields" / "polygons.json").read_text(encoding="utf-8"))
OUT = Path(__file__).parent / "_capprobe"
OUT.mkdir(exist_ok=True)

SCALE = 3.0
VW = POLY["viewWidth"]
VH = POLY["viewHeight"]
W, H = int(VW * SCALE), int(VH * SCALE)


def sx(x):
    return x * SCALE


def sy(y):
    return y * SCALE


def draw_poly(d, pts, *, fill=None, outline=None, width=1):
    xy = [(sx(p[0]), sy(p[1])) for p in pts]
    if fill is not None:
        d.polygon(xy, fill=fill)
    if outline is not None:
        d.line(xy + [xy[0]], fill=outline, width=width)


def draw_segs(d, segs, *, fill, width):
    for s in segs:
        d.line([(sx(s[0][0]), sy(s[0][1])), (sx(s[1][0]), sy(s[1][1]))], fill=fill, width=width)


def lot_edges_segs():
    """Every lot polygon boundary, as individual segments."""
    out = []
    for pts in POLY["lots"].values():
        n = len(pts)
        for i in range(n):
            a, b = pts[i], pts[(i + 1) % n]
            out.append([a, b])
    return out


def realistic():
    img = Image.new("RGB", (W, H), (250, 248, 244))
    d = ImageDraw.Draw(img)
    for p in POLY["parentLots"]:
        draw_poly(d, p, fill=(240, 237, 230), outline=(212, 204, 184), width=1)
    if POLY.get("subjectArea"):
        draw_poly(d, POLY["subjectArea"], fill=(255, 255, 255), outline=(26, 39, 68), width=max(1, int(1.2 * SCALE)))
    if POLY.get("pos"):
        draw_poly(d, POLY["pos"], fill=(184, 217, 155), outline=(107, 155, 74), width=max(1, int(0.8 * SCALE)))
    draw_segs(d, POLY["roadReserves"], fill=(229, 225, 216), width=max(1, int(0.4 * SCALE)))
    draw_segs(d, POLY["roads"], fill=(184, 176, 160), width=max(1, int(0.6 * SCALE)))
    for pts in POLY["lots"].values():
        draw_poly(d, pts, fill=(232, 226, 212), outline=(153, 153, 153), width=max(1, int(0.4 * SCALE)))
    return img


def layered():
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    # context first, highlight layers last (on top)
    draw_segs(d, lot_edges_segs(), fill=(150, 150, 150), width=max(1, int(0.4 * SCALE)))   # GREY lot edges
    if POLY.get("subjectArea"):
        draw_poly(d, POLY["subjectArea"], outline=(0, 0, 0), width=max(1, int(1.0 * SCALE)))  # BLACK subject
    if POLY.get("pos"):
        draw_poly(d, POLY["pos"], outline=(0, 170, 0), width=max(2, int(1.5 * SCALE)))         # GREEN POS
    draw_segs(d, POLY["roadReserves"], fill=(0, 90, 255), width=max(2, int(1.2 * SCALE)))       # BLUE reserves
    draw_segs(d, POLY["roads"], fill=(255, 140, 0), width=max(2, int(1.0 * SCALE)))             # ORANGE roads
    return img


def crop_box(X0, Y0, X1, Y1, pad=10):
    return (int(sx(X0) - pad), int(sy(Y0) - pad), int(sx(X1) + pad), int(sy(Y1) + pad))


def realistic_variant(skip=None):
    """Realistic render, optionally omitting one layer to see what vanishes.
    skip in {None,'roads','roadReserves','lotStroke','pos','subject'}."""
    img = Image.new("RGB", (W, H), (250, 248, 244))
    d = ImageDraw.Draw(img)
    for p in POLY["parentLots"]:
        draw_poly(d, p, fill=(240, 237, 230), outline=(212, 204, 184), width=1)
    if POLY.get("subjectArea"):
        draw_poly(d, POLY["subjectArea"], fill=(255, 255, 255),
                  outline=None if skip == "subject" else (26, 39, 68), width=max(1, int(1.2 * SCALE)))
    if POLY.get("pos"):
        draw_poly(d, POLY["pos"], fill=(184, 217, 155),
                  outline=None if skip == "pos" else (107, 155, 74), width=max(1, int(0.8 * SCALE)))
    if skip != "roadReserves":
        draw_segs(d, POLY["roadReserves"], fill=(229, 225, 216), width=max(1, int(0.4 * SCALE)))
    if skip != "roads":
        draw_segs(d, POLY["roads"], fill=(184, 176, 160), width=max(1, int(0.6 * SCALE)))
    for pts in POLY["lots"].values():
        draw_poly(d, pts, fill=(232, 226, 212),
                  outline=None if skip == "lotStroke" else (153, 153, 153), width=max(1, int(0.4 * SCALE)))
    return img


def removal_crops(X0, Y0, X1, Y1):
    """For a bbox: realistic + realistic-minus-each-layer, so the cap that
    vanishes identifies the owning layer. Big zoom (the marks are tiny)."""
    box = crop_box(X0, Y0, X1, Y1, pad=14)
    variants = [
        ("full", None), ("no-roads", "roads"), ("no-RR", "roadReserves"),
        ("no-lotStroke", "lotStroke"), ("no-POS", "pos"), ("no-subject", "subject"),
    ]
    tiles = []
    for name, skip in variants:
        c = realistic_variant(skip).crop(box)
        zoom = 4
        c = c.resize((c.width * zoom, c.height * zoom), Image.NEAREST)
        tiles.append((name, c))
    tw = max(t[1].width for t in tiles); th = max(t[1].height for t in tiles)
    gap = 16
    strip = Image.new("RGB", (len(tiles) * (tw + gap), th + 30), (255, 255, 255))
    sd = ImageDraw.Draw(strip)
    try:
        font = ImageFont.truetype("arial.ttf", 22)
    except Exception:
        font = ImageFont.load_default()
    for i, (name, c) in enumerate(tiles):
        x = i * (tw + gap)
        strip.paste(c, (x, 26))
        sd.text((x + 4, 2), name, fill=(180, 0, 0), font=font)
    return strip


def isolated_crops(X0, Y0, X1, Y1):
    box = crop_box(X0, Y0, X1, Y1, pad=12)
    layers = {
        "roads": (lambda d: draw_segs(d, POLY["roads"], fill=(255, 0, 0), width=max(2, int(0.6 * SCALE)))),
        "roadReserves": (lambda d: draw_segs(d, POLY["roadReserves"], fill=(255, 0, 0), width=max(2, int(0.4 * SCALE)))),
        "lotEdges": (lambda d: draw_segs(d, lot_edges_segs(), fill=(255, 0, 0), width=max(2, int(0.4 * SCALE)))),
        "posSubject": (lambda d: (
            draw_poly(d, POLY["pos"], outline=(255, 0, 0), width=max(2, int(0.8 * SCALE))) if POLY.get("pos") else None,
            draw_poly(d, POLY["subjectArea"], outline=(255, 0, 0), width=max(2, int(1.2 * SCALE))) if POLY.get("subjectArea") else None,
        )),
    }
    tiles = []
    for name, fn in layers.items():
        img = Image.new("RGB", (W, H), (255, 255, 255))
        dd = ImageDraw.Draw(img)
        # faint context: all lot edges in light grey
        draw_segs(dd, lot_edges_segs(), fill=(220, 220, 220), width=max(1, int(0.4 * SCALE)))
        fn(dd)
        c = img.crop(box)
        tiles.append((name, c))
    # stitch horizontally with labels
    tw = max(t[1].width for t in tiles)
    th = max(t[1].height for t in tiles)
    gap = 16
    strip = Image.new("RGB", (len(tiles) * (tw + gap), th + 28), (255, 255, 255))
    sd = ImageDraw.Draw(strip)
    try:
        font = ImageFont.truetype("arial.ttf", 18)
    except Exception:
        font = ImageFont.load_default()
    for i, (name, c) in enumerate(tiles):
        x = i * (tw + gap)
        strip.paste(c, (x, 24))
        sd.text((x + 4, 2), name, fill=(0, 0, 0), font=font)
    return strip


if __name__ == "__main__":
    realistic().save(OUT / "A_realistic.png")
    layered().save(OUT / "B_layered.png")
    print(f"[write] {OUT/'A_realistic.png'}  {W}x{H}")
    print(f"[write] {OUT/'B_layered.png'}")
    if len(sys.argv) == 5:
        X0, Y0, X1, Y1 = map(float, sys.argv[1:5])
        strip = isolated_crops(X0, Y0, X1, Y1)
        name = f"C_isolated_{int(X0)}_{int(Y0)}_{int(X1)}_{int(Y1)}.png"
        strip.save(OUT / name)
        print(f"[write] {OUT/name}")
        rstrip = removal_crops(X0, Y0, X1, Y1)
        rname = f"D_removal_{int(X0)}_{int(Y0)}_{int(X1)}_{int(Y1)}.png"
        rstrip.save(OUT / rname)
        print(f"[write] {OUT/rname}")
