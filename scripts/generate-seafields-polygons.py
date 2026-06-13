"""Regenerate src/data/seafields/polygons.json (+ geojson.json) from the
authoritative CLE 3027-08B DA plan (DWG).

DA-FAITHFUL EXTRACTION (rewritten 2026-05-26 after Uwe's QA challenge):

The DWG carries two lot layers:
  - `Cad-Poly`            — the DA-approved subdivision (what the plan prints).
  - `Cad-Poly WAPC202888` — a separate/superseded re-cut. NOT the approved DA.

Proof that `Cad-Poly` is the DA: the DWG's own `Areas` layer (the "NNNm²"
labels printed on each lot of the DA plan) matches the `Cad-Poly` polygon area
for EVERY lot to within ~1 m², and `Cad-Poly` tiles with zero overlaps. The
WAPC202888 layer does NOT match the Areas labels. An earlier version of this
script (and the original V6 extraction) wrongly used WAPC202888 for ~22 lots,
which (a) produced the overlapping lots Ray White flagged and (b) put wrong
m² on the site (e.g. lot 331 shown elsewhere as 525 when the DA says 749).

So: we extract `Cad-Poly` ONLY, and ASSERT every lot's polygon area matches
its DA `Areas` label (hard gate — the build fails if any lot drifts > the
tolerance). The `amendments` map is emitted empty; the renderers fall back to
the base polygon, which is the DA.

Street labels: the N-Stname MTEXT use top-left attachment, centre-justified in
a width box; we emit the TRUE text centre (insert + width/2) so labels sit on
their roads and "David Road" stops clipping to "vid Road".

Usage: python scripts/generate-seafields-polygons.py
Requires: ezdxf, pyproj, shapely + the ODA File Converter.
Also prints the DA area per lot so lots.ts displayed areas can be corrected.
"""
from __future__ import annotations

import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path
from typing import Optional

import ezdxf
from ezdxf import path as ezpath
from pyproj import Transformer
from shapely.geometry import Polygon as ShapelyPolygon

sys.stdout.reconfigure(encoding="utf-8")

FLATTEN_DISTANCE = 0.05
DWG_INPUT = r"C:\Users\denni\PycharmProjects\F2K-Fund-Tokenisation\Seafields_141_lots\Seafields CLE Files\3027-08B (Sub)_email\3027-08B (Sub)_email.dwg"
MGA50_TO_WGS84 = Transformer.from_crs("EPSG:28350", "EPSG:4326", always_xy=True)
SETBACK_M = 1.5
VIEW_W = 1000
PAD = 32
# A lot's extracted polygon area must match its DA Areas-label within this
# tolerance, else the build fails. Polygon flattening + label rounding give a
# few m² of slack; >3% (min 8 m²) means a real mismatch (wrong polygon/lot).
AREA_TOL_FRAC = 0.03
AREA_TOL_MIN = 8.0

REPO = Path(__file__).parent.parent
OUT_JSON = REPO / "src" / "data" / "seafields" / "polygons.json"
OUT_GEOJSON = REPO / "src" / "data" / "seafields" / "geojson.json"
# Derived trim: just {lotId: areaM2}. RegistrationForm needs only the buildable
# area per lot (a single int), not the full polygon geometry — importing this
# instead of polygons.json keeps the ~155 KB of coordinate arrays out of the
# initial estate-page bundle (the map components still import polygons.json, but
# they're lazy-mounted below the fold). Do not hand-edit — regenerated here.
OUT_AREAS = REPO / "src" / "data" / "seafields" / "buildable-areas.json"


def find_oda() -> Optional[Path]:
    for env in ("ProgramFiles", "ProgramFiles(x86)"):
        pf = Path(os.environ.get(env, ""))
        if not pf.exists():
            continue
        for child in pf.iterdir():
            if child.name.startswith("ODA"):
                for sub in child.rglob("ODAFileConverter.exe"):
                    return sub
    return None


def dwg_to_dxf(dwg_path: str, oda_exe: Path) -> Path:
    src = Path(dwg_path)
    in_dir = Path(tempfile.mkdtemp())
    out_dir = Path(tempfile.mkdtemp())
    shutil.copy2(src, in_dir / src.name)
    cmd = [str(oda_exe), str(in_dir), str(out_dir), "ACAD2018", "DXF", "0", "1"]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if proc.returncode != 0:
        raise RuntimeError(f"ODA failed: {proc.stderr}")
    return next(out_dir.glob("*.dxf"))


def poly_centroid(pts):
    n = len(pts)
    return (sum(p[0] for p in pts) / n, sum(p[1] for p in pts) / n)


def point_in_poly(p, poly):
    x, y = p
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def _flatten_entity(e):
    try:
        p = ezpath.make_path(e)
        return [(v.x, v.y) for v in p.flattening(distance=FLATTEN_DISTANCE)]
    except Exception:
        return []


def collect_polys(msp, layer):
    out = []
    for e in msp:
        if e.dxftype() != "LWPOLYLINE" or e.dxf.layer != layer:
            continue
        try:
            if not e.closed:
                continue
        except Exception:
            continue
        pts = _flatten_entity(e)
        if not pts:
            pts = [(p[0], p[1]) for p in e.get_points("xy")]
        if len(pts) >= 2 and pts[0] == pts[-1]:
            pts = pts[:-1]
        if len(pts) < 3:
            continue
        out.append(pts)
    return out


# Carriageway "entrance cap" lines/arcs to DROP from Cad-Rd-Car so each road
# mouth renders open (kerb-return arcs are kept). Confirmed with Dennis
# 2026-05-27 via the labelled-render review (scripts/_capprobe/, source of
# truth confirmed_caps.json): cap LINEs 3,5,16,20,27,28,30,37 + cap ARCs A24,A33.
# Matched by DWG endpoint pair (order-independent) — entity iteration order is
# NOT stable, but coordinates are.
CAP_EXCLUSION_TOL = 0.5
CAP_EXCLUSIONS = [
    ((269893.835, 6821646.676), (269925.035, 6821646.737)),  # line 3
    ((269912.857, 6821751.919), (269912.907, 6821721.919)),  # line 5
    ((270086.798, 6821707.727), (270107.959, 6821719.05)),   # line 16
    ((270157.754, 6821986.652), (270187.754, 6821986.709)),  # line 20
    ((270243.753, 6821986.813), (270273.753, 6821986.869)),  # line 27
    ((270244.562, 6821760.158), (270274.56, 6821761.287)),   # line 28
    ((270261.966, 6821859.849), (270262.015, 6821829.849)),  # line 30
    ((270323.983, 6821986.963), (270353.983, 6821987.019)),  # line 37
    ((270204.163, 6821758.638), (270164.529, 6821749.123)),  # arc A24
    ((270336.232, 6821854.798), (270346.804, 6821838.436)),  # arc A33
]


def _is_capped(p0, p1):
    t = CAP_EXCLUSION_TOL
    for a, b in CAP_EXCLUSIONS:
        if ((abs(p0[0] - a[0]) <= t and abs(p0[1] - a[1]) <= t and
             abs(p1[0] - b[0]) <= t and abs(p1[1] - b[1]) <= t) or
            (abs(p0[0] - b[0]) <= t and abs(p0[1] - b[1]) <= t and
             abs(p1[0] - a[0]) <= t and abs(p1[1] - a[1]) <= t)):
            return True
    return False


def collect_lines(msp, layer, drop_caps=False):
    out = []
    for e in msp:
        if e.dxf.layer != layer:
            continue
        if e.dxftype() == "LINE":
            p0 = (e.dxf.start.x, e.dxf.start.y)
            p1 = (e.dxf.end.x, e.dxf.end.y)
            if drop_caps and _is_capped(p0, p1):
                continue
            out.append([p0, p1])
        elif e.dxftype() in ("LWPOLYLINE", "POLYLINE", "ARC"):
            pts = _flatten_entity(e)
            if not pts and e.dxftype() in ("LWPOLYLINE", "POLYLINE"):
                try:
                    if e.dxftype() == "LWPOLYLINE":
                        pts = [(p[0], p[1]) for p in e.get_points("xy")]
                    else:
                        pts = [(v.dxf.location.x, v.dxf.location.y) for v in e.vertices]
                except Exception:
                    pts = []
            if drop_caps and len(pts) >= 2 and _is_capped(pts[0], pts[-1]):
                continue
            for i in range(len(pts) - 1):
                out.append([pts[i], pts[i + 1]])
    return out


def collect_lot_labels(msp):
    out = []
    for e in msp:
        if e.dxftype() not in ("TEXT", "MTEXT") or e.dxf.layer != "N-Lotno indicative":
            continue
        txt = (e.dxf.text if e.dxftype() == "TEXT" else e.text).strip()
        m = re.match(r"^(\d{3})$", txt)
        if not m:
            continue
        n = int(m.group(1))
        if not (200 <= n <= 400):
            continue
        ip = e.dxf.insert
        out.append({"n": n, "x": ip.x, "y": ip.y})
    return out


def collect_area_labels(msp):
    """The DA `Areas` layer — the printed 'NNNm²' on each lot. Authoritative."""
    out = []
    for e in msp:
        if e.dxftype() not in ("TEXT", "MTEXT") or e.dxf.layer != "Areas":
            continue
        raw = e.dxf.text if e.dxftype() == "TEXT" else e.text
        m = re.search(r"(\d+(?:\.\d+)?)\s*m", raw)
        if not m:
            continue
        ip = e.dxf.insert
        out.append({"area": float(m.group(1)), "x": ip.x, "y": ip.y})
    return out


# DWG N-Stname text fixes. NOTE (2026-05-27): the earlier PEAD FAIRWAY ->
# POND FAIRWAY rename (commit 71625d6, Nicky Banks 2026-05-26) was REVERSED by
# Dennis — the road is PEAD FAIRWAY. The fairway label is now emitted as a
# manual VERTICAL label in main() (the DWG N-Stname fairway label is dropped),
# so no rename is applied here.
STREET_NAME_FIX = {}


def collect_street_labels(msp):
    out = []
    for e in msp:
        if e.dxftype() not in ("TEXT", "MTEXT") or e.dxf.layer != "N-Stname":
            continue
        raw = e.dxf.text if e.dxftype() == "TEXT" else e.text
        txt = re.sub(r"\\[pP][xqc;]*", "", raw)
        txt = re.sub(r"\s+", " ", txt).strip()
        txt = STREET_NAME_FIX.get(txt.upper(), txt)
        if not txt:
            continue
        ip = e.dxf.insert
        rotation = getattr(e.dxf, "rotation", 0.0) or 0.0
        cx, cy = ip.x, ip.y
        if e.dxftype() == "MTEXT":
            width = getattr(e.dxf, "width", 0.0) or 0.0
            char_h = getattr(e.dxf, "char_height", 0.0) or 0.0
            attach = getattr(e.dxf, "attachment_point", 1) or 1
            col = (attach - 1) % 3   # 0 left, 1 centre, 2 right
            row = (attach - 1) // 3  # 0 top, 1 middle, 2 bottom
            if col == 0:
                cx = ip.x + width / 2.0
            elif col == 2:
                cx = ip.x - width / 2.0
            if row == 0:
                cy = ip.y - char_h / 2.0
            elif row == 2:
                cy = ip.y + char_h / 2.0
        out.append({"text": txt, "x": cx, "y": cy, "rotation": rotation})
    return out


def main():
    oda = find_oda()
    if not oda:
        print("ERROR: ODA File Converter not found")
        return 1
    print(f"[oda] {oda}")
    dxf = dwg_to_dxf(DWG_INPUT, oda)
    print(f"[dxf] {dxf}")

    doc = ezdxf.readfile(dxf)
    msp = doc.modelspace()

    base_polys = collect_polys(msp, "Cad-Poly")
    heritage_polys = collect_polys(msp, "Cad-Poly existing building lot")
    pos_polys = collect_polys(msp, "Cad-Poly POS")
    subject_polys = collect_polys(msp, "G-Bndy Subject Area")
    parent_polys = collect_polys(msp, "G-Bndy Parent Lot")
    road_lines = collect_lines(msp, "Cad-Rd-Car", drop_caps=True)
    rr_lines = collect_lines(msp, "Cad-RR")
    lot_labels = collect_lot_labels(msp)
    area_labels = collect_area_labels(msp)
    street_labels = collect_street_labels(msp)

    print(f"[layers] base={len(base_polys)} heritage={len(heritage_polys)} "
          f"lot_labels={len(lot_labels)} area_labels={len(area_labels)} "
          f"streets={len(street_labels)}")

    # DA area per lot number = nearest `Areas` label to the lot-number label.
    # (For duplicate numbers 294/348 we keep a list, matched per-polygon below.)
    def nearest_area(x, y):
        best, bd = None, 1e18
        for a in area_labels:
            d = (x - a["x"]) ** 2 + (y - a["y"]) ** 2
            if d < bd:
                bd, best = d, a["area"]
        return best

    # heritage labels first
    used_label_idx = set()
    heritage_id_for_poly = {}
    for hi, poly in enumerate(heritage_polys):
        for li, lab in enumerate(lot_labels):
            if li in used_label_idx:
                continue
            if point_in_poly((lab["x"], lab["y"]), poly):
                heritage_id_for_poly[hi] = lab["n"]
                used_label_idx.add(li)
                break

    # base polys -> lot id; duplicate numbers (294/348) suffix a/b for ALL
    # occurrences so keys match lots.ts (avoids the white-render bug).
    label_num_counts = Counter(lab["n"] for lab in lot_labels)
    seen = {}
    base_id_for_poly = {}
    da_area_for_id = {}
    for bi, poly in enumerate(base_polys):
        for li, lab in enumerate(lot_labels):
            if li in used_label_idx:
                continue
            if point_in_poly((lab["x"], lab["y"]), poly):
                n = lab["n"]
                seen[n] = seen.get(n, 0) + 1
                suffix = (
                    chr(ord("a") + seen[n] - 1) if label_num_counts[n] > 1 else ""
                )
                lot_id = f"L{n}{suffix}"
                base_id_for_poly[bi] = lot_id
                da_area_for_id[lot_id] = nearest_area(lab["x"], lab["y"])
                used_label_idx.add(li)
                break

    subj = subject_polys[0] if subject_polys else None
    xs = [p[0] for p in subj]; ys = [p[1] for p in subj]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    width_m = max_x - min_x
    height_m = max_y - min_y
    aspect = height_m / width_m
    inner_w = VIEW_W - 2 * PAD
    inner_h = inner_w * aspect
    view_h = inner_h + 2 * PAD
    units_per_m = inner_w / width_m
    sq_units_per_m2 = units_per_m * units_per_m

    def proj(x, y):
        return [round((x - min_x) / width_m * inner_w + PAD, 2),
                round((max_y - y) / height_m * inner_h + PAD, 2)]

    def proj_pts(pts):
        return [proj(x, y) for x, y in pts]

    def to_wgs84(pts_dwg):
        out = []
        for x, y in pts_dwg:
            lon, lat = MGA50_TO_WGS84.transform(x, y)
            out.append([round(lon, 7), round(lat, 7)])
        return out

    def envelope_for(pts_dwg):
        try:
            poly = ShapelyPolygon(pts_dwg)
            if not poly.is_valid:
                poly = poly.buffer(0)
            env = poly.buffer(-SETBACK_M, join_style="mitre")
            if env.is_empty or env.geom_type not in ("Polygon", "MultiPolygon"):
                return None, 0.0
            if env.geom_type == "MultiPolygon":
                env = max(env.geoms, key=lambda g: g.area)
            ext = list(env.exterior.coords)
            if ext and ext[0] == ext[-1]:
                ext = ext[:-1]
            return [proj(x, y) for x, y in ext], env.area
        except Exception as e:
            print(f"  [envelope] failed: {e}")
            return None, 0.0

    # FINAL street labels (Dennis, 2026-05-27): keep COLLINS ROAD horizontal
    # (from the DWG, projected); re-emit DAVID ROAD, PEAD FAIRWAY and SUTCLIFFE
    # ROAD NORTH as VERTICAL (rotation 90) manual labels at the reviewed SVG
    # positions; drop Pepper Gate / Pirrotina Link / Half Moon Drive entirely.
    final_street_labels = []
    for s in street_labels:
        if s["text"].strip().upper() == "COLLINS ROAD":
            px, py = proj(s["x"], s["y"])
            final_street_labels.append({"text": s["text"], "x": px, "y": py, "rotation": 0})
    final_street_labels += [
        {"text": "DAVID ROAD", "x": 22.0, "y": 536.0, "rotation": 90},
        {"text": "PEAD FAIRWAY", "x": 752.0, "y": 279.0, "rotation": 90},
        {"text": "SUTCLIFFE ROAD NORTH", "x": 975.0, "y": 240.0, "rotation": 90},
    ]

    out = {
        "_comment": "Generated by scripts/generate-seafields-polygons.py from CLE 3027-08B DA (Cad-Poly layer = the approved DA; WAPC202888 NOT used). Polygon areas validated against the DWG Areas layer. Do not hand-edit.",
        "viewBox": f"0 0 {VIEW_W} {round(view_h, 2)}",
        "viewWidth": VIEW_W,
        "viewHeight": round(view_h, 2),
        "unitsPerMetre": round(units_per_m, 4),
        "setbackMetres": SETBACK_M,
        "subjectAreaMeters": {"width": round(width_m, 1), "height": round(height_m, 1)},
        "subjectArea": proj_pts(subj) if subj else None,
        "parentLots": [proj_pts(p) for p in parent_polys],
        "pos": proj_pts(pos_polys[0]) if pos_polys else None,
        "lots": {},
        "heritageLots": {},
        "amendments": {},  # base IS the DA; no amendment override
        "buildableEnvelopes": {},
        "roads": [[proj(*a), proj(*b)] for a, b in road_lines],
        "roadReserves": [[proj(*a), proj(*b)] for a, b in rr_lines],
        "streetLabels": final_street_labels,
        "daAreasM2": {},  # DA Areas-layer figure per lot (authoritative for display)
    }

    for bi, lot_id in base_id_for_poly.items():
        out["lots"][lot_id] = proj_pts(base_polys[bi])
        out["daAreasM2"][lot_id] = round(da_area_for_id.get(lot_id) or 0)
        env_pts, env_area = envelope_for(base_polys[bi])
        if env_pts is not None:
            out["buildableEnvelopes"][lot_id] = {"points": env_pts, "areaM2": round(env_area)}
    for hi, n in heritage_id_for_poly.items():
        out["heritageLots"][f"L{n}"] = proj_pts(heritage_polys[hi])

    # --- HARD GATE 1: polygon area must match the DA Areas label ---
    print("\n[validate] polygon area vs DA Areas layer:")
    area_fail = []
    for bi, lot_id in base_id_for_poly.items():
        # base_polys are raw DWG coords in MGA50 metres, so .area is m² directly.
        poly_m2 = ShapelyPolygon(base_polys[bi]).area
        da = da_area_for_id.get(lot_id)
        if da is None:
            area_fail.append((lot_id, None, round(poly_m2)))
            continue
        tol = max(AREA_TOL_MIN, da * AREA_TOL_FRAC)
        if abs(poly_m2 - da) > tol:
            area_fail.append((lot_id, da, round(poly_m2)))
    if area_fail:
        for lid, da, pm in area_fail:
            print(f"  ❌ {lid}: DA={da} polygon={pm}")
    print(f"  area mismatches: {len(area_fail)}")

    # --- HARD GATE 2: lots must tile with no overlaps ---
    final = {lid: ShapelyPolygon(pts).buffer(0) for lid, pts in out["lots"].items()}
    ids = list(final)
    overlaps = 0
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            inter = final[ids[i]].intersection(final[ids[j]]).area
            mn = min(final[ids[i]].area, final[ids[j]].area)
            if mn and inter / mn > 0.03:
                overlaps += 1
                print(f"  ❌ OVERLAP {ids[i]} x {ids[j]} {inter/mn*100:.0f}%")
    print(f"[validate] lots={len(out['lots'])} heritage={len(out['heritageLots'])} "
          f"overlaps>3%={overlaps}")

    OUT_JSON.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"[write] {OUT_JSON} ({OUT_JSON.stat().st_size:,} bytes)")

    # Derived trim for RegistrationForm: {lotId: areaM2} only (see OUT_AREAS).
    areas = {lid: env["areaM2"] for lid, env in out["buildableEnvelopes"].items()}
    OUT_AREAS.write_text(json.dumps(areas, indent=0), encoding="utf-8")
    print(f"[write] {OUT_AREAS} ({OUT_AREAS.stat().st_size:,} bytes)")

    # GeoJSON (Mapbox / WGS84) — base geometry
    features = []
    for bi, lot_id in base_id_for_poly.items():
        coords = to_wgs84(base_polys[bi])
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])
        m = re.match(r"^L(\d+)([a-z]?)$", lot_id)
        features.append({
            "type": "Feature", "id": lot_id,
            "geometry": {"type": "Polygon", "coordinates": [coords]},
            "properties": {
                "lotId": lot_id,
                "lotNumber": int(m.group(1)) if m else None,
                "lotSuffix": m.group(2) if m else "",
                "areaM2": round(da_area_for_id.get(lot_id) or ShapelyPolygon(base_polys[bi]).area),
                "kind": "lot",
                "isAmended": False,
                "isPendingRenumber": bool(m and m.group(2)),
            },
        })
    for hi, n in heritage_id_for_poly.items():
        coords = to_wgs84(heritage_polys[hi])
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])
        features.append({
            "type": "Feature", "id": f"L{n}",
            "geometry": {"type": "Polygon", "coordinates": [coords]},
            "properties": {"lotId": f"L{n}", "lotNumber": n,
                           "areaM2": round(ShapelyPolygon(heritage_polys[hi]).area),
                           "kind": "heritage", "isHeritage": True},
        })
    if pos_polys:
        coords = to_wgs84(pos_polys[0])
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])
        features.append({"type": "Feature", "id": "POS",
                         "geometry": {"type": "Polygon", "coordinates": [coords]},
                         "properties": {"kind": "pos",
                                        "areaM2": round(ShapelyPolygon(pos_polys[0]).area),
                                        "label": "Public Open Space"}})
    bounds = None
    if subj:
        coords = to_wgs84(subj)
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])
        features.append({"type": "Feature", "id": "subject-area",
                         "geometry": {"type": "Polygon", "coordinates": [coords]},
                         "properties": {"kind": "subjectArea"}})
        lons = [p[0] for p in coords]; lats = [p[1] for p in coords]
        bounds = {"south": round(min(lats), 7), "west": round(min(lons), 7),
                  "north": round(max(lats), 7), "east": round(max(lons), 7),
                  "centre": [round((min(lons) + max(lons)) / 2, 7),
                             round((min(lats) + max(lats)) / 2, 7)]}
    geojson = {"type": "FeatureCollection",
               "_comment": "Generated from CLE 3027-08B DA (Cad-Poly). MGA50 (EPSG:28350) -> WGS84.",
               "bounds": bounds, "features": features}
    OUT_GEOJSON.write_text(json.dumps(geojson, indent=2), encoding="utf-8")
    print(f"[geojson] {OUT_GEOJSON} ({OUT_GEOJSON.stat().st_size:,} bytes, {len(features)} features)")

    # Surface the DA-area-vs-lots.ts deltas so displayed areas can be corrected.
    ts_path = REPO / "src" / "data" / "seafields" / "lots.ts"
    ts = ts_path.read_text(encoding="utf-8")
    print("\n[lots.ts] displayed-area corrections needed (site -> DA):")
    diffs = []
    for lot_id, da in sorted(da_area_for_id.items(), key=lambda kv: kv[0]):
        if not da:
            continue
        n = re.sub(r"[^0-9]", "", lot_id)
        m = re.search(r"lot\(" + n + r",\s*(\d+)", ts)
        if not m:
            continue
        st = int(m.group(1))
        if abs(st - da) > 6:
            diffs.append((lot_id, st, round(da)))
    for lid, st, da in diffs:
        print(f"  {lid}: {st} -> {da}")
    print(f"  ({len(diffs)} lots differ from DA by >6 m²)")
    return 0 if (not area_fail and not overlaps) else 2


if __name__ == "__main__":
    raise SystemExit(main())
