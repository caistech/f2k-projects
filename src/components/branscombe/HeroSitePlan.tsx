import { UNIT_BY_ID, HOUSE_TYPE_INFO, type HouseType } from "@/data/branscombe";
import polygonsData from "@/data/branscombe/polygons.json";

type Polygons = {
  viewBox: string;
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

const POLYGONS = polygonsData as Polygons;

function pointsToD(pts: number[][]): string {
  if (pts.length === 0) return "";
  return (
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + " Z"
  );
}

/**
 * Static, non-interactive hero version of the Branscombe site plan.
 * Shows home footprints coloured by type with no labels — for visual context
 * in the hero only. Use PlanView for the interactive picker.
 */
export default function HeroSitePlan() {
  return (
    <svg
      viewBox={POLYGONS.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto block"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Branscombe Estate site plan — 37 homes"
    >
      {/* Site boundary */}
      {POLYGONS.siteBoundary && (
        <path
          d={pointsToD(POLYGONS.siteBoundary)}
          fill="#FAF8F4"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          opacity="0.95"
        />
      )}

      {/* Public open space (greenway) */}
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

      {/* Roads */}
      <g stroke="#C8C2B5" strokeWidth="0.6" strokeLinecap="round">
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

      {/* Kerbs (lighter) */}
      <g stroke="#DDD8CD" strokeWidth="0.3" strokeLinecap="round">
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

      {/* Decks */}
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

      {/* Home footprints */}
      {Object.entries(POLYGONS.homes).map(([id, h]) => {
        const unit = UNIT_BY_ID[id];
        const info = HOUSE_TYPE_INFO[h.type];
        if (!unit || !info) return null;
        return (
          <path
            key={id}
            d={pointsToD(h.points)}
            fill={info.color}
            stroke={info.border}
            strokeWidth="0.35"
            opacity="0.92"
          />
        );
      })}
    </svg>
  );
}
