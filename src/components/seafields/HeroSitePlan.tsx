import { LOTS, STAGE_INFO, type LotStage } from "@/data/seafields";
import polygonsData from "@/data/seafields/polygons.json";

type Polygons = {
  viewBox: string;
  subjectArea: number[][] | null;
  parentLots: number[][][];
  pos: number[][] | null;
  lots: Record<string, number[][]>;
  heritageLots: Record<string, number[][]>;
  amendments: Record<string, number[][]>;
  roads: number[][][];
  roadReserves: number[][][];
};

const POLYGONS = polygonsData as Polygons;

function pointsToD(pts: number[][]): string {
  if (pts.length === 0) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + " Z";
}

/**
 * Static, non-interactive hero version of the site plan. Shows lot polygons
 * coloured by stage with no labels — for visual context in the hero only.
 * Use PlanView for the interactive lot picker.
 */
export default function HeroSitePlan() {
  const lotById = new Map(LOTS.map((l) => [l.id, l] as const));

  const finalLotPolys: Array<[string, number[][]]> = [];
  for (const [id, pts] of Object.entries(POLYGONS.lots)) {
    finalLotPolys.push([id, POLYGONS.amendments[id] || pts]);
  }

  return (
    <svg
      viewBox={POLYGONS.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto block"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Seafields Estate subdivision plan — 145 lots across 7 stages"
    >
      <defs>
        <pattern
          id="heroHeritageHatch"
          patternUnits="userSpaceOnUse"
          width="5"
          height="5"
          patternTransform="rotate(45)"
        >
          <rect width="5" height="5" fill="#F5E7D6" />
          <line x1="0" y1="0" x2="0" y2="5" stroke="#C7A877" strokeWidth="1.2" />
        </pattern>
      </defs>

      {/* Subject area background */}
      {POLYGONS.subjectArea && (
        <path
          d={pointsToD(POLYGONS.subjectArea)}
          fill="#FAF8F4"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          opacity="0.95"
        />
      )}

      {/* Public Open Space */}
      {POLYGONS.pos && (
        <path
          d={pointsToD(POLYGONS.pos)}
          fill="#B8D99B"
          stroke="#6B9B4A"
          strokeWidth="0.6"
        />
      )}

      {/* Roads */}
      <g stroke="#B8B0A0" strokeWidth="0.5">
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

      {/* Lot polygons coloured by stage */}
      {finalLotPolys.map(([id, pts]) => {
        const lot = lotById.get(id);
        if (!lot || !lot.stage) return null;
        const info = STAGE_INFO[lot.stage as Exclude<LotStage, null>];
        return (
          <path
            key={id}
            d={pointsToD(pts)}
            fill={info.color}
            stroke={info.border}
            strokeWidth="0.35"
            opacity="0.92"
          />
        );
      })}

      {/* Heritage lots */}
      {Object.entries(POLYGONS.heritageLots).map(([id, pts]) => (
        <path
          key={`heritage-${id}`}
          d={pointsToD(pts)}
          fill="url(#heroHeritageHatch)"
          stroke="#8B6F1E"
          strokeWidth="0.6"
          strokeDasharray="2 1.5"
        />
      ))}
    </svg>
  );
}
