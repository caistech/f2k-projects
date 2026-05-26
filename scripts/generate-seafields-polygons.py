"""Regenerate src/data/seafields/polygons.json (+ geojson.json) from the
authoritative CLE 3027-08B DWG.

This is the f2k-projects-local copy of the extractor (the original lives in
F2K-Fund-Tokenisation/scripts/v6-extract). It fixes two defects that the
Ray White selling agent flagged on 2026-05-26:

  1. AMENDMENT MIS-ASSIGNMENT (lots overlapping each other).
     The WAPC202888 amendment layer holds 28 polygons that tile the amended
     cluster cleanly. The old extractor matched them to lots by
     "base-centroid-inside-amendment", which mis-assigned several (two base
     lots' centroids could fall in one amendment polygon; the correctly
     labelled polygon was then dropped), leaving stale neighbours that
     overlapped the amended lots by 10-54%. We now assign each amendment to a
     base lot by the surveyor's own lot-number label that falls inside it
     (authoritative), with max-overlap as the tie-break and a global 1-1
     constraint. Amendment polygons that match no real lot (two ~500 m2
     re-cut slivers in the 269/307 fan) are dropped.

  2. STREET LABELS CLIPPED / OFF THEIR STREETS ("vid Road").
     The N-Stname MTEXT entities use top-left attachment (attach=1) with
     centre-justified text in a ~132-140 unit-wide box. The old extractor
     stored the top-left insert point and PlanView re-centred on it, pulling
     every label left by half its width (David Road, near the left edge,
     clipped to "vid Road"). We now emit the true text CENTRE
     (insert.x + width/2, insert.y - char_height/2) so each label sits where
     the surveyor placed it.

Usage: python scripts/generate-seafields-polygons.py
Requires: ezdxf, pyproj, shapely, scipy, numpy + the ODA File Converter.
"""
from __future__ import annotations

import json
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
import numpy as np
from ezdxf import path as ezpath
from pyproj import Transformer
from scipy.optimize import linear_sum_assignment
from shapely.geometry import Polygon as ShapelyPolygon
from shapely.ops import unary_union

sys.stdout.reconfigure(encoding="utf-8")

FLATTEN_DISTANCE = 0.05
DWG_INPUT = r"C:\Users\denni\PycharmProjects\F2K-Fund-Tokenisation\Seafields_141_lots\Seafields CLE Files\3027-08B (Sub)_email\3027-08B (Sub)_email.dwg"
MGA50_TO_WGS84 = Transformer.from_crs("EPSG:28350", "EPSG:4326", always_xy=True)
SETBACK_M = 1.5
VIEW_W = 1000
PAD = 32

REPO = Path(__file__).parent.parent
OUT_JSON = REPO / "src" / "data" / "seafields" / "polygons.json"
OUT_GEOJSON = REPO / "src" / "data" / "seafields" / "geojson.json"

# Amendment polygons that match no sellable lot (re-cut slivers in the
# 269/307 fan: ~501 + ~504 m2, overlapping no base lot). Documented + dropped
# so they neither overlap nor get a phantom lot id. See render verification
# 2026-05-26 (scripts/seafields-dwg-render.py).
MIN_AMEND_OVERLAP_FRAC = 0.20  # an amendment must cover >=20% of a base lot to bind


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


def collect_lines(msp, layer):
    out = []
    for e in msp:
        if e.dxf.layer != layer:
            continue
        if e.dxftype() == "LINE":
            out.append([(e.dxf.start.x, e.dxf.start.y), (e.dxf.end.x, e.dxf.end.y)])
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


def collect_street_labels(msp):
    """N-Stname MTEXT: top-left attachment, centre-justified in a width box.
    Return the TRUE text centre so the renderer (text-anchor=middle) places it
    where the surveyor intended — fixing the 'vid Road' clip + misalignment."""
    out = []
    for e in msp:
        if e.dxftype() not in ("TEXT", "MTEXT") or e.dxf.layer != "N-Stname":
            continue
        raw = e.dxf.text if e.dxftype() == "TEXT" else e.text
        txt = re.sub(r"\\[pP][xqc;]*", "", raw)
        txt = re.sub(r"\s+", " ", txt).strip()
        if not txt:
            continue
        ip = e.dxf.insert
        rotation = getattr(e.dxf, "rotation", 0.0) or 0.0
        cx, cy = ip.x, ip.y
        if e.dxftype() == "MTEXT":
            width = getattr(e.dxf, "width", 0.0) or 0.0
            char_h = getattr(e.dxf, "char_height", 0.0) or 0.0
            attach = getattr(e.dxf, "attachment_point", 1) or 1
            # attachment 1/2/3 = top row, 4/5/6 = middle, 7/8/9 = bottom
            # columns 1/4/7 = left, 2/5/8 = centre, 3/6/9 = right
            col = (attach - 1) % 3  # 0 left, 1 centre, 2 right
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


def assign_amendments(amend_polys, base_polys, base_id_for_poly, labels):
    """Assign each WAPC202888 amendment polygon to a base lot id.

    Identity comes from the surveyor's lot-number label that falls inside the
    amendment polygon (authoritative). Ties / no-label cases fall back to
    maximum overlap with the labelled base lot, solved as a global 1-1
    assignment. Amendments that cannot bind to a real lot (>=20% overlap or a
    contained label) are dropped. Returns {base_lot_id: amend_poly}.
    """
    sa = [ShapelyPolygon(p).buffer(0) for p in amend_polys]
    sb = {bi: ShapelyPolygon(base_polys[bi]).buffer(0) for bi in base_id_for_poly}
    # number -> list of base indices (handles duplicate numbers 294a/294b)
    num_to_bis: dict[int, list[int]] = {}
    for bi, lid in base_id_for_poly.items():
        n = int(re.sub(r"[^0-9]", "", lid))
        num_to_bis.setdefault(n, []).append(bi)

    # candidate base indices per amendment: those whose label is inside it
    cand = {}
    for ai, ap in enumerate(amend_polys):
        inside_nums = {lab["n"] for lab in labels if point_in_poly((lab["x"], lab["y"]), ap)}
        bis = []
        for n in inside_nums:
            bis.extend(num_to_bis.get(n, []))
        cand[ai] = bis

    # cost matrix [amend x base] using overlap; restrict to candidates when a
    # candidate set exists, else allow any base (max overlap), gated later.
    bidx = list(sb)
    bpos = {bi: k for k, bi in enumerate(bidx)}
    NEG = 1e9
    cost = np.full((len(sa), len(bidx)), NEG)
    overlap = np.zeros((len(sa), len(bidx)))
    for ai in range(len(sa)):
        allowed = cand[ai] if cand[ai] else bidx
        for bi in allowed:
            ov = sa[ai].intersection(sb[bi]).area
            overlap[ai, bpos[bi]] = ov
            cost[ai, bpos[bi]] = -ov  # maximise overlap
    row, col = linear_sum_assignment(cost)
    result = {}
    bound_amend = set()
    for ai, k in zip(row, col):
        if cost[ai, k] >= NEG:
            continue  # no allowed cell chosen
        bi = bidx[k]
        ov = overlap[ai, k]
        had_label = bool(cand[ai])
        frac = ov / sa[ai].area if sa[ai].area else 0
        # bind if the label was inside (authoritative) or overlap is material
        if had_label or frac >= MIN_AMEND_OVERLAP_FRAC:
            result[base_id_for_poly[bi]] = amend_polys[ai]
            bound_amend.add(ai)

    # Fallback for unbound amendments (e.g. the re-subdivided 294b polygon,
    # which barely overlaps the OLD 294b base): bind to the nearest lot-number
    # label whose lot is not yet bound. Re-cut slivers in the 269/307 fan stay
    # dropped because their nearest lots (307, 269) are already bound.
    bound_nums = {int(re.sub(r"[^0-9]", "", lid)) for lid in result}
    for ai in range(len(sa)):
        if ai in bound_amend:
            continue
        cx, cy = poly_centroid(amend_polys[ai])
        labs = sorted(labels, key=lambda L: (L["x"] - cx) ** 2 + (L["y"] - cy) ** 2)
        bound = False
        for lab in labs[:4]:
            n = lab["n"]
            free = [bi for bi in num_to_bis.get(n, [])
                    if base_id_for_poly[bi] not in result]
            if free:
                bi = max(free, key=lambda b: sa[ai].intersection(sb[b]).area)
                result[base_id_for_poly[bi]] = amend_polys[ai]
                bound_amend.add(ai)
                bound = True
                break
        if not bound:
            print(f"  [drop] amend #{ai} area={sa[ai].area:.0f} -> no real lot (sliver)")
    return result


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
    amend_polys = collect_polys(msp, "Cad-Poly WAPC202888")
    heritage_polys = collect_polys(msp, "Cad-Poly existing building lot")
    pos_polys = collect_polys(msp, "Cad-Poly POS")
    subject_polys = collect_polys(msp, "G-Bndy Subject Area")
    parent_polys = collect_polys(msp, "G-Bndy Parent Lot")
    road_lines = collect_lines(msp, "Cad-Rd-Car")
    rr_lines = collect_lines(msp, "Cad-RR")
    lot_labels = collect_lot_labels(msp)
    street_labels = collect_street_labels(msp)

    print(f"[layers] base={len(base_polys)} amend={len(amend_polys)} "
          f"heritage={len(heritage_polys)} labels={len(lot_labels)} "
          f"streets={len(street_labels)}")

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

    # Pre-count label occurrences per lot number. A number that appears 2+
    # times (294, 348 — the DWG carries 2 polygons per number pending CLE
    # renumber) suffixes EVERY occurrence a/b/... including the first, so the
    # keys match the L294a/L294b ids in lots.ts. (Order-independent — the
    # previous "count unused labels after this one" logic produced a bare
    # L294 for one poly, which is the white-render bug fixed in 34b8a65.)
    label_num_counts = Counter(lab["n"] for lab in lot_labels)
    seen_lot_no_count = {}
    base_id_for_poly = {}
    for bi, poly in enumerate(base_polys):
        for li, lab in enumerate(lot_labels):
            if li in used_label_idx:
                continue
            if point_in_poly((lab["x"], lab["y"]), poly):
                n = lab["n"]
                seen_lot_no_count[n] = seen_lot_no_count.get(n, 0) + 1
                count = seen_lot_no_count[n]
                suffix = (
                    chr(ord("a") + count - 1) if label_num_counts[n] > 1 else ""
                )
                base_id_for_poly[bi] = f"L{n}{suffix}"
                used_label_idx.add(li)
                break

    print("[amendments] assigning WAPC202888 polygons by surveyor label + overlap")
    amend_for_id = assign_amendments(amend_polys, base_polys, base_id_for_poly, lot_labels)
    print(f"  bound {len(amend_for_id)} amendments -> "
          f"{sorted(amend_for_id, key=lambda s: int(re.sub(chr(92)+'D','',s)))}")

    # Unamended neighbours of the amended cluster (e.g. 304, 312) keep their
    # original boundary, but the amendment moved the SHARED edge into them.
    # Clip each unamended base lot to cede exactly the strip an adjacent
    # amendment now occupies — a deterministic reconciliation against the
    # authoritative amendment geometry (not a guess). Far-away lots are
    # untouched (no intersection). Result: the whole estate tiles, no overlaps.
    amend_union = unary_union([ShapelyPolygon(p).buffer(0) for p in amend_for_id.values()])
    clipped_base = {}  # bi -> clipped DWG polygon
    for bi, lot_id in base_id_for_poly.items():
        if lot_id in amend_for_id:
            continue
        bp = ShapelyPolygon(base_polys[bi]).buffer(0)
        if not bp.intersects(amend_union):
            continue
        inter = bp.intersection(amend_union).area
        if inter / bp.area < 0.005:
            continue  # negligible shared-edge sliver, leave as-is
        diff = bp.difference(amend_union)
        if diff.geom_type == "MultiPolygon":
            diff = max(diff.geoms, key=lambda g: g.area)
        if diff.is_empty or diff.area < 0.5 * bp.area:
            print(f"  [clip] {lot_id}: skipped (would remove too much)")
            continue
        ext = list(diff.exterior.coords)
        if ext and ext[0] == ext[-1]:
            ext = ext[:-1]
        clipped_base[bi] = [(round(x, 3), round(y, 3)) for x, y in ext]
        print(f"  [clip] {lot_id}: ceded {inter:.0f} m2 to adjacent amendment")

    def base_geom(bi):
        return clipped_base.get(bi, base_polys[bi])

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

    def proj(x, y):
        nx = (x - min_x) / width_m * inner_w + PAD
        ny = (max_y - y) / height_m * inner_h + PAD
        return [round(nx, 2), round(ny, 2)]

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

    out = {
        "_comment": "Generated by scripts/generate-seafields-polygons.py from CLE 3027-08B DWG. Do not hand-edit. Amendments bound by surveyor lot-number label (2026-05-26 Ray White overlap fix).",
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
        "amendments": {},
        "buildableEnvelopes": {},
        "roads": [[proj(*a), proj(*b)] for a, b in road_lines],
        "roadReserves": [[proj(*a), proj(*b)] for a, b in rr_lines],
        "streetLabels": [
            {"text": s["text"], "x": proj(s["x"], s["y"])[0],
             "y": proj(s["x"], s["y"])[1], "rotation": s["rotation"]}
            for s in street_labels
        ],
    }

    for bi, lot_id in base_id_for_poly.items():
        out["lots"][lot_id] = proj_pts(base_geom(bi))
        env_source = amend_for_id.get(lot_id) or base_geom(bi)
        env_pts, env_area = envelope_for(env_source)
        if env_pts is not None:
            out["buildableEnvelopes"][lot_id] = {"points": env_pts, "areaM2": round(env_area)}
    for hi, n in heritage_id_for_poly.items():
        out["heritageLots"][f"L{n}"] = proj_pts(heritage_polys[hi])
    for lot_id, apoly in amend_for_id.items():
        out["amendments"][lot_id] = proj_pts(apoly)

    # --- self-validation: final geometry must tile with ~0 overlap ---
    final = {}
    for lid, pts in out["lots"].items():
        final[lid] = ShapelyPolygon(out["amendments"].get(lid, pts)).buffer(0)
    ids = list(final)
    overlaps = []
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            inter = final[ids[i]].intersection(final[ids[j]]).area
            mn = min(final[ids[i]].area, final[ids[j]].area)
            if mn and inter / mn > 0.03:
                overlaps.append((ids[i], ids[j], inter / mn))
    print(f"[validate] lots={len(out['lots'])} amendments={len(out['amendments'])} "
          f"heritage={len(out['heritageLots'])} overlaps>3%={len(overlaps)}")
    for a, b, f in overlaps:
        print(f"  OVERLAP {a} x {b} = {f*100:.0f}%")

    OUT_JSON.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"[write] {OUT_JSON} ({OUT_JSON.stat().st_size:,} bytes)")

    # --- GeoJSON (Mapbox, WGS84) ---
    features = []
    for bi, lot_id in base_id_for_poly.items():
        env_source = amend_for_id.get(lot_id) or base_geom(bi)
        coords = to_wgs84(env_source)
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
                "areaM2": round(ShapelyPolygon(env_source).area),
                "kind": "lot",
                "isAmended": lot_id in amend_for_id,
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
               "_comment": "Generated from CLE 3027-08B DWG. MGA50 (EPSG:28350) -> WGS84.",
               "bounds": bounds, "features": features}
    OUT_GEOJSON.write_text(json.dumps(geojson, indent=2), encoding="utf-8")
    print(f"[geojson] {OUT_GEOJSON} ({OUT_GEOJSON.stat().st_size:,} bytes, {len(features)} features)")
    return 0 if not overlaps else 2


if __name__ == "__main__":
    raise SystemExit(main())
