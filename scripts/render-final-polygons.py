"""Render the FINAL src/data/seafields/polygons.json (amendment-resolved) to a
PNG for visual verification of the cluster tiling + lot numbers + clip results.
"""
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).parent.parent
P = json.loads((REPO / "src/data/seafields/polygons.json").read_text(encoding="utf-8"))
FOCUS = os.environ.get("FOCUS", "")  # csv of lot numbers to frame
OUT = Path(__file__).parent / (os.environ.get("OUTNAME", "_final") + ".png")

final = {}
for lid, pts in P["lots"].items():
    final[lid] = P["amendments"].get(lid, pts)

def num(lid):
    return int("".join(c for c in lid if c.isdigit()))

if FOCUS:
    keep = set(int(x) for x in FOCUS.split(","))
    ids = [l for l in final if num(l) in keep]
else:
    ids = list(final)

xs = [p[0] for l in ids for p in final[l]]
ys = [p[1] for l in ids for p in final[l]]
pad = 6
minx, maxx = min(xs) - pad, max(xs) + pad
miny, maxy = min(ys) - pad, max(ys) + pad
W = 2200
scale = W / (maxx - minx)
H = int((maxy - miny) * scale)

def tx(x, y):
    return ((x - minx) * scale, (y - miny) * scale)

img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img, "RGBA")
fs = int(os.environ.get("FS", "30"))
try:
    font = ImageFont.truetype("arialbd.ttf", fs)
except Exception:
    font = ImageFont.load_default()

for lid in ids:
    pts = [tx(x, y) for x, y in final[lid]]
    amended = lid in P["amendments"]
    fill = (0, 150, 80, 55) if amended else (120, 120, 120, 30)
    outline = (0, 120, 60, 255) if amended else (90, 90, 90, 255)
    d.polygon(pts, outline=outline, fill=fill)
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    col = (0, 110, 50, 255) if amended else (40, 40, 40, 255)
    d.text((cx - fs * 0.6, cy - fs * 0.5), lid[1:], fill=col, font=font)

# street labels with the same clamp the renderer applies
try:
    sfont = ImageFont.truetype("arialbd.ttf", int(fs * 0.95))
except Exception:
    sfont = font
vw = P["viewWidth"]
for s in P["streetLabels"]:
    halfW = len(s["text"]) * (6.5 * 0.6 + 1) / 2
    sx = min(max(s["x"], halfW + 3), vw - halfW - 3)
    px, py = tx(sx, s["y"])
    bb = d.textbbox((0, 0), s["text"], font=sfont)
    d.text((px - (bb[2] - bb[0]) / 2, py - (bb[3] - bb[1]) / 2), s["text"],
           fill=(150, 30, 30, 255), font=sfont)

img.save(OUT)
print(f"[write] {OUT} ({W}x{H}) green=amended grey=base ids={len(ids)}")
