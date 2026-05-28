"""FINAL CHECK preview: render the Seafields site map in realistic PlanView
style (no debug numbers) with the confirmed cap deletions + street-label
changes applied, drawn directly from the DWG carriageway so nothing in the
live polygons.json is touched yet.

Confirmed final set (scripts/_capprobe/confirmed_caps.json):
  cap LINEs : 3,5,16,20,27,28,30,37
  cap ARCs  : 24,33
  streets   : rename POND FAIRWAY -> PEAD FAIRWAY;
              delete Pepper Gate / Pirrotina Link / Half Moon Drive /
              Sutcliffe Road North (horizontal — to be re-added vertical later)
"""
import sys; sys.path.insert(0, "scripts")
import json
from importlib import import_module
from pathlib import Path

import ezdxf
from ezdxf import path as ezpath
from PIL import Image, ImageDraw, ImageFont

gen = import_module("generate-seafields-polygons")
OUT = Path("scripts/_capprobe")
S = 3.0
CAP_LINES = {3, 5, 16, 20, 27, 28, 30, 37}
CAP_ARCS = {24, 33}
STREET_DELETE = {"PEPPER GATE", "PIRROTINA LINK", "HALF MOON DRIVE", "SUTCLIFFE ROAD NORTH"}
STREET_RENAME = {"POND FAIRWAY": "PEAD FAIRWAY"}


def flat(e):
    p = ezpath.make_path(e)
    return [(v.x, v.y) for v in p.flattening(distance=0.1)]


def main():
    oda = gen.find_oda(); dxf = gen.dwg_to_dxf(gen.DWG_INPUT, oda)
    doc = ezdxf.readfile(dxf); msp = doc.modelspace()
    subj = gen.collect_polys(msp, "G-Bndy Subject Area")[0]
    xs = [p[0] for p in subj]; ys = [p[1] for p in subj]
    mnx, mxx, mny, mxy = min(xs), max(xs), min(ys), max(ys)
    wm, hm = mxx - mnx, mxy - mny
    VW, PAD = gen.VIEW_W, gen.PAD
    iw = VW - 2 * PAD; ih = iw * (hm / wm); vh = ih + 2 * PAD

    def proj(x, y):
        return ((x - mnx) / wm * iw + PAD, (mxy - y) / hm * ih + PAD)

    lines, arcs = [], []
    for e in msp:
        if e.dxf.layer != "Cad-Rd-Car":
            continue
        pts = flat(e)
        if len(pts) < 2:
            continue
        sp = [proj(x, y) for x, y in pts]
        (lines if e.dxftype() == "LINE" else arcs).append(sp)

    def mp(ps):
        return (round(sum(p[0] for p in ps) / len(ps), 1), round(sum(p[1] for p in ps) / len(ps), 1))
    lines.sort(key=mp); arcs.sort(key=mp)

    W, H = int(VW * S), int(vh * S)
    poly = json.loads(Path("src/data/seafields/polygons.json").read_text())
    img = Image.new("RGB", (W, H), (250, 248, 244))
    d = ImageDraw.Draw(img)

    def fp(pts, fill, ol, w=1):
        xy = [(x * S, y * S) for x, y in pts]
        d.polygon(xy, fill=fill)
        d.line(xy + [xy[0]], fill=ol, width=w)

    # context (PlanView colours)
    for p in poly.get("parentLots", []):
        fp(p, (240, 237, 230), (212, 204, 184))
    if poly.get("subjectArea"):
        fp(poly["subjectArea"], (255, 255, 255), (26, 39, 68), max(1, int(1.2 * S)))
    if poly.get("pos"):
        fp(poly["pos"], (184, 217, 155), (107, 155, 74), max(1, int(0.8 * S)))
    # road reserves (light) — unchanged
    for seg in poly["roadReserves"]:
        d.line([(seg[0][0] * S, seg[0][1] * S), (seg[1][0] * S, seg[1][1] * S)], fill=(229, 225, 216), width=max(1, int(0.4 * S)))
    # lots
    for pts in poly["lots"].values():
        fp(pts, (232, 226, 212), (153, 153, 153), max(1, int(0.4 * S)))
    # carriageway = Cad-Rd-Car minus the cap lines/arcs (tan)
    for i, ps in enumerate(lines):
        if i in CAP_LINES:
            continue
        d.line([(x * S, y * S) for x, y in ps], fill=(184, 176, 160), width=max(2, int(0.6 * S)))
    for ai, ps in enumerate(arcs):
        if ai in CAP_ARCS:
            continue
        d.line([(x * S, y * S) for x, y in ps], fill=(184, 176, 160), width=max(2, int(0.6 * S)))

    # POS centre label
    if poly.get("pos"):
        cx = sum(p[0] for p in poly["pos"]) / len(poly["pos"]); cy = sum(p[1] for p in poly["pos"]) / len(poly["pos"])
        try:
            pf = ImageFont.truetype("arialbd.ttf", int(9 * S))
        except Exception:
            pf = ImageFont.load_default()
        d.text((cx * S, cy * S), "Public Open Space", fill=(60, 92, 42), font=pf, anchor="mm")

    # lot numbers (small, for orientation)
    try:
        lf = ImageFont.truetype("arial.ttf", int(5.0 * S))
    except Exception:
        lf = ImageFont.load_default()
    for lid, pts in poly["lots"].items():
        n = "".join(c for c in lid if c.isdigit())
        cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
        d.text((cx * S, cy * S), n, fill=(120, 120, 120), font=lf, anchor="mm")

    # FINAL street labels: Collins horizontal (kept as-is); David Road, Pead
    # Fairway, Sutcliffe Road North re-added VERTICAL (rotation 90) at the
    # positions Dennis marked in red on dennis_corrected_5.JPG.
    collins = next((s for s in poly.get("streetLabels", []) if s["text"].strip().upper() == "COLLINS ROAD"), None)
    FINAL_LABELS = []
    if collins:
        FINAL_LABELS.append({"text": "COLLINS ROAD", "x": collins["x"], "y": collins["y"], "rotation": 0})
    FINAL_LABELS += [
        {"text": "DAVID ROAD", "x": 22, "y": 536, "rotation": 90},
        {"text": "PEAD FAIRWAY", "x": 752, "y": 279, "rotation": 90},
        {"text": "SUTCLIFFE ROAD NORTH", "x": 975, "y": 240, "rotation": 90},
    ]
    try:
        sf = ImageFont.truetype("arialbd.ttf", int(6.5 * S))
    except Exception:
        sf = ImageFont.load_default()

    def draw_label(text, x, y, rotation):
        bb = d.textbbox((0, 0), text, font=sf)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        pad = 6
        tmp = Image.new("RGBA", (tw + pad * 2, th + pad * 2), (0, 0, 0, 0))
        td = ImageDraw.Draw(tmp)
        td.text((pad - bb[0], pad - bb[1]), text, fill=(26, 39, 68, 255), font=sf)
        if rotation:
            tmp = tmp.rotate(rotation, expand=True)
        img.paste(tmp, (int(x * S - tmp.width / 2), int(y * S - tmp.height / 2)), tmp)

    for L in FINAL_LABELS:
        draw_label(L["text"], L["x"], L["y"], L["rotation"])

    img.save(OUT / "F_FINAL_preview2.png")
    w = 1900
    img.resize((w, int(w * H / W)), Image.LANCZOS).save(OUT / "F_FINAL_preview2_view.png")
    print(f"[write] {OUT/'F_FINAL_preview2.png'} ({W}x{H}) + _view")
    print(f"  caps removed: lines {sorted(CAP_LINES)} arcs {sorted(CAP_ARCS)}")
    print(f"  streets renamed: {STREET_RENAME}; deleted: {sorted(STREET_DELETE)}")


if __name__ == "__main__":
    main()
