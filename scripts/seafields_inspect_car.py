"""Inspect the DWG Cad-Rd-Car (carriageway) layer structure so we can detect
'caps' at the polyline level instead of on exploded 2-point segments.
Prints, per entity: dxftype, closed?, vertex count, bbox, total length.
Reuses the generator's DWG->DXF conversion."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import ezdxf
from ezdxf import path as ezpath

from importlib import import_module
gen = import_module("generate-seafields-polygons")  # find_oda, dwg_to_dxf, DWG_INPUT


def main():
    oda = gen.find_oda()
    if not oda:
        print("ERROR: ODA not found")
        return 1
    dxf = gen.dwg_to_dxf(gen.DWG_INPUT, oda)
    doc = ezdxf.readfile(dxf)
    msp = doc.modelspace()
    n = 0
    for layer in ("Cad-Rd-Car", "Cad-RR"):
        print(f"\n===== layer {layer} =====")
        ents = [e for e in msp if e.dxf.layer == layer]
        print(f"  {len(ents)} entities")
        types = {}
        for e in ents:
            t = e.dxftype()
            types[t] = types.get(t, 0) + 1
        print(f"  types: {types}")
        for e in ents:
            t = e.dxftype()
            closed = None
            vtx = None
            try:
                closed = bool(e.closed)
            except Exception:
                closed = "?"
            if t == "LWPOLYLINE":
                vtx = len(e.get_points("xy"))
            elif t == "POLYLINE":
                vtx = len(list(e.vertices))
            try:
                p = ezpath.make_path(e)
                pts = [(v.x, v.y) for v in p.flattening(distance=0.1)]
            except Exception:
                pts = []
            if pts:
                xs = [q[0] for q in pts]; ys = [q[1] for q in pts]
                bbox = (round(min(xs), 1), round(min(ys), 1), round(max(xs), 1), round(max(ys), 1))
                length = sum(((pts[i + 1][0] - pts[i][0]) ** 2 + (pts[i + 1][1] - pts[i][1]) ** 2) ** 0.5 for i in range(len(pts) - 1))
            else:
                bbox = None; length = 0
            if layer == "Cad-Rd-Car":
                print(f"  [{n}] {t} closed={closed} vtx={vtx} flatpts={len(pts)} len={length:.1f}m bbox={bbox}")
            n += 1


if __name__ == "__main__":
    raise SystemExit(main())
