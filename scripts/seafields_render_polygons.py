"""Render a polygons.json PlanView-style (lots/POS/subject/roads + street
labels with rotation + the PlanView edge-clamp incl. the rotated-label fix).
Used to verify the live result. Usage: python ... <polygons.json> <out.png>"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

S = 3.0
src, out = sys.argv[1], sys.argv[2]
P = json.loads(Path(src).read_text())
VW = P["viewWidth"]; VH = P["viewHeight"]
W, H = int(VW * S), int(VH * S)
img = Image.new("RGB", (W, H), (250, 248, 244))
d = ImageDraw.Draw(img)


def fp(pts, fill, ol, w=1):
    xy = [(x * S, y * S) for x, y in pts]
    d.polygon(xy, fill=fill)
    d.line(xy + [xy[0]], fill=ol, width=w)


for p in P.get("parentLots", []):
    fp(p, (240, 237, 230), (212, 204, 184))
if P.get("subjectArea"):
    fp(P["subjectArea"], (255, 255, 255), (26, 39, 68), max(1, int(1.2 * S)))
if P.get("pos"):
    fp(P["pos"], (184, 217, 155), (107, 155, 74), max(1, int(0.8 * S)))
for seg in P["roadReserves"]:
    d.line([(seg[0][0] * S, seg[0][1] * S), (seg[1][0] * S, seg[1][1] * S)], fill=(229, 225, 216), width=max(1, int(0.4 * S)))
for seg in P["roads"]:
    d.line([(seg[0][0] * S, seg[0][1] * S), (seg[1][0] * S, seg[1][1] * S)], fill=(184, 176, 160), width=max(2, int(0.6 * S)))
for pts in P["lots"].values():
    fp(pts, (232, 226, 212), (153, 153, 153), max(1, int(0.4 * S)))
if P.get("pos"):
    cx = sum(p[0] for p in P["pos"]) / len(P["pos"]); cy = sum(p[1] for p in P["pos"]) / len(P["pos"])
    try:
        pf = ImageFont.truetype("arialbd.ttf", int(9 * S))
    except Exception:
        pf = ImageFont.load_default()
    d.text((cx * S, cy * S), "Public Open Space", fill=(60, 92, 42), font=pf, anchor="mm")
try:
    lf = ImageFont.truetype("arial.ttf", int(5.0 * S))
except Exception:
    lf = ImageFont.load_default()
for lid, pts in P["lots"].items():
    n = "".join(c for c in lid if c.isdigit())
    cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
    d.text((cx * S, cy * S), n, fill=(120, 120, 120), font=lf, anchor="mm")

# street labels — replicate PlanView (FONT 6.5, rotated-label clamp fix)
FONT = 6.5
try:
    sf = ImageFont.truetype("arialbd.ttf", int(FONT * S))
except Exception:
    sf = ImageFont.load_default()
for sdef in P.get("streetLabels", []):
    txt = sdef["text"]; rot = sdef.get("rotation", 0)
    is_rot = abs(rot) >= 45
    halfW = (FONT * 0.6) if is_rot else (len(txt) * (FONT * 0.6 + 1)) / 2
    margin = 3
    x = min(max(sdef["x"], halfW + margin), VW - halfW - margin)
    y = sdef["y"]
    bb = d.textbbox((0, 0), txt, font=sf)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    pad = 6
    tmp = Image.new("RGBA", (tw + pad * 2, th + pad * 2), (0, 0, 0, 0))
    td = ImageDraw.Draw(tmp)
    td.text((pad - bb[0], pad - bb[1]), txt, fill=(26, 39, 68, 255), font=sf)
    if rot:
        tmp = tmp.rotate(rot, expand=True)
    img.paste(tmp, (int(x * S - tmp.width / 2), int(y * S - tmp.height / 2)), tmp)

img.save(out)
w = 1900
img.resize((w, int(w * H / W)), Image.LANCZOS).save(out.replace(".png", "_view.png"))
print(f"[write] {out} (+_view)")
