"use client";

import {
  UNIT_BY_ID,
  HOUSE_TYPE_INFO,
  type HouseType,
  type UnitData,
} from "@/data/branscombe";
import polygonsData from "@/data/branscombe/polygons.json";
import voronoiData from "@/data/branscombe/voronoi.json";

interface AllocationLite {
  unit_number: number;
  allocated_to: string | null;
}

interface PlanViewProps {
  selectedUnits: string[];
  counts: Record<string, number>;
  /** Indexed by unit_number — only units with allocated_to set are reserved. */
  allocations?: Record<number, AllocationLite>;
  hoveredUnit: string | null;
  setHoveredUnit: (id: string | null) => void;
  onToggleUnit: (id: string) => void;
  /** Show indicative Voronoi-derived lot boundaries. Off by default. */
  showInferredLots?: boolean;
}

type Polygons = {
  viewBox: string;
  viewWidth: number;
  viewHeight: number;
  unitsPerMetre?: number;
  siteExtentMetres?: { width: number; height: number };
  siteBoundary: number[][] | null;
  homes: Record<
    string,
    { points: number[][]; type: HouseType; areaM2: number; labelXY: number[] }
  >;
  decks: number[][][];
  pos: number[][][];
  roads: number[][][];
  kerbs: number[][][];
};

type Voronoi = {
  viewBox: string;
  lots: Record<string, { points: number[][]; areaM2: number }>;
};

const POLYGONS = polygonsData as Polygons;
const VORONOI = voronoiData as Voronoi;

function pointsToD(pts: number[][]): string {
  if (pts.length === 0) return "";
  return (
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + " Z"
  );
}

function fillForState(
  count: number,
  isSelected: boolean,
  isReserved: boolean,
  baseColor: string,
): { fill: string; stroke: string; strokeWidth: number } {
  if (isReserved) {
    return { fill: "rgba(100, 116, 139, 0.92)", stroke: "#475569", strokeWidth: 0.5 };
  }
  if (isSelected) {
    return { fill: "rgba(26, 39, 68, 0.95)", stroke: "#FFFFFF", strokeWidth: 1.4 };
  }
  if (count >= 3) {
    return { fill: "rgba(232, 93, 74, 0.85)", stroke: "#C0392B", strokeWidth: 0.5 };
  }
  if (count === 2) {
    return { fill: "rgba(200, 169, 81, 0.85)", stroke: "#B8941A", strokeWidth: 0.5 };
  }
  if (count === 1) {
    return { fill: "rgba(232, 165, 55, 0.82)", stroke: "#CC8A1E", strokeWidth: 0.5 };
  }
  return { fill: baseColor, stroke: "#1A2744", strokeWidth: 0.4 };
}

export default function PlanView({
  selectedUnits,
  counts,
  allocations = {},
  hoveredUnit,
  setHoveredUnit,
  onToggleUnit,
  showInferredLots = false,
}: PlanViewProps) {
  return (
    <div className="relative w-full bg-[#FAF8F4] border border-black/10 overflow-hidden">
      <svg
        viewBox={POLYGONS.viewBox}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto block"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Branscombe Estate interactive plan view"
      >
        {/* Site boundary */}
        {POLYGONS.siteBoundary && (
          <path
            d={pointsToD(POLYGONS.siteBoundary)}
            fill="#FFFFFF"
            stroke="#1A2744"
            strokeWidth="1"
          />
        )}

        {/* Public open space */}
        {POLYGONS.pos.map((pos, i) => (
          <path
            key={`pos-${i}`}
            d={pointsToD(pos)}
            fill="#B8D99B"
            stroke="#6B9B4A"
            strokeWidth="0.5"
            opacity="0.7"
          />
        ))}

        {/* Indicative inferred lot boundaries (Voronoi) — toggleable */}
        {showInferredLots &&
          Object.entries(VORONOI.lots).map(([id, lot]) => (
            <path
              key={`vor-${id}`}
              d={pointsToD(lot.points)}
              fill="rgba(0, 181, 173, 0.06)"
              stroke="#00B5AD"
              strokeWidth="0.5"
              strokeDasharray="3 2"
              opacity="0.85"
              pointerEvents="none"
            />
          ))}

        {/* Kerbs */}
        <g stroke="#DDD8CD" strokeWidth="0.35" strokeLinecap="round">
          {POLYGONS.kerbs.map((seg, i) => (
            <line
              key={`kerb-${i}`}
              x1={seg[0][0]}
              y1={seg[0][1]}
              x2={seg[1][0]}
              y2={seg[1][1]}
            />
          ))}
        </g>

        {/* Roads */}
        <g stroke="#B8B0A0" strokeWidth="0.6" strokeLinecap="round">
          {POLYGONS.roads.map((seg, i) => (
            <line
              key={`road-${i}`}
              x1={seg[0][0]}
              y1={seg[0][1]}
              x2={seg[1][0]}
              y2={seg[1][1]}
            />
          ))}
        </g>

        {/* Decks (under home footprints) */}
        {POLYGONS.decks.map((d, i) => (
          <path
            key={`deck-${i}`}
            d={pointsToD(d)}
            fill="#D6BD96"
            stroke="#A0875A"
            strokeWidth="0.4"
            opacity="0.7"
          />
        ))}

        {/* Home footprints — interactive */}
        {Object.entries(POLYGONS.homes).map(([id, h]) => {
          const unit: UnitData | undefined = UNIT_BY_ID[id];
          if (!unit) return null;
          const info = HOUSE_TYPE_INFO[h.type];
          const isSelected = selectedUnits.includes(id);
          const isHovered = hoveredUnit === id;
          const isReserved = !!allocations[unit.unitNumber]?.allocated_to;
          const count = counts[id] || 0;

          const state = fillForState(count, isSelected, isReserved, info.color);
          const stroke = isHovered && !isSelected ? "#00B5AD" : state.stroke;
          const strokeWidth = isHovered && !isSelected ? 1.2 : state.strokeWidth;

          const [lx, ly] = h.labelXY;
          const ariaLabel =
            `${id} — Type ${unit.type}, ${info.size} home, ${unit.zone}` +
            (isReserved
              ? ", reserved"
              : count > 0
                ? `, ${count} interested`
                : "") +
            (isSelected ? ", selected" : "");

          const handleClick = isReserved ? undefined : () => onToggleUnit(id);

          return (
            <g
              key={id}
              role={isReserved ? undefined : "button"}
              aria-label={ariaLabel}
              aria-pressed={isReserved ? undefined : isSelected}
              aria-disabled={isReserved || undefined}
              tabIndex={isReserved ? -1 : 0}
              onClick={handleClick}
              onKeyDown={(e) => {
                if (
                  !isReserved &&
                  (e.key === "Enter" || e.key === " ")
                ) {
                  e.preventDefault();
                  onToggleUnit(id);
                }
              }}
              onMouseEnter={() => setHoveredUnit(id)}
              onMouseLeave={() => setHoveredUnit(null)}
              style={{
                cursor: isReserved ? "not-allowed" : "pointer",
                outline: "none",
              }}
            >
              <path
                d={pointsToD(h.points)}
                fill={state.fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={0.94}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="5"
                fontWeight="700"
                fill={isSelected ? "#FFFFFF" : "#FFFFFF"}
                stroke="#000000"
                strokeWidth="0.15"
                paintOrder="stroke"
                fontFamily="Archivo, sans-serif"
                pointerEvents="none"
              >
                {unit.unitNumber}
              </text>
              {count > 0 && !isSelected && (
                <g pointerEvents="none">
                  <circle cx={lx + 8} cy={ly - 5} r="2.5" fill="#1A2744" />
                  <text
                    x={lx + 8}
                    y={ly - 4.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="3"
                    fontWeight="700"
                    fill="#FFFFFF"
                    fontFamily="Archivo, sans-serif"
                  >
                    {count}
                  </text>
                </g>
              )}
              {isSelected && (
                <g pointerEvents="none">
                  <circle cx={lx + 8} cy={ly - 5} r="2.8" fill="#00B5AD" />
                  <text
                    x={lx + 8}
                    y={ly - 4.4}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="3.6"
                    fill="#FFFFFF"
                    fontFamily="Archivo, sans-serif"
                  >
                    ✓
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Caption */}
      <div className="absolute bottom-2 right-3 text-[10px] font-archivo text-slate/60 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded">
        Unison 20E92-03 RevC
        {POLYGONS.siteExtentMetres
          ? ` · ${POLYGONS.siteExtentMetres.width}×${POLYGONS.siteExtentMetres.height}m`
          : ""}
      </div>
    </div>
  );
}
