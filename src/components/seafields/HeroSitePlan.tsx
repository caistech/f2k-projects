import {
  LOTS,
  STAGE_INFO,
  STAGE_ANCHORS,
  type LotStage,
} from "@/data/seafields";
import polygonsData from "@/data/seafields/polygons.json";

type Polygons = {
  viewBox: string;
  viewWidth: number;
  viewHeight: number;
  subjectArea: number[][] | null;
  parentLots: number[][][];
  pos: number[][] | null;
  lots: Record<string, number[][]>;
  heritageLots: Record<string, number[][]>;
  amendments: Record<string, number[][]>;
  roads: number[][][];
  roadReserves: number[][][];
  streetLabels: { text: string; x: number; y: number; rotation: number }[];
};

const POLYGONS = polygonsData as Polygons;

const STAGES = ["1", "2", "3", "4", "5", "6", "7"] as const;

// White-halo style so labels stay legible over any stage colour.
const HALO = {
  paintOrder: "stroke",
  stroke: "#FFFFFF",
  strokeWidth: "0.9px",
  strokeLinejoin: "round",
} as const;

function pointsToD(pts: number[][]): string {
  if (pts.length === 0) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + " Z";
}

function centroid(pts: number[][]): { x: number; y: number } {
  const x = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const y = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return { x, y };
}

/**
 * Static, non-interactive hero version of the site plan. Shows lot polygons
 * coloured by stage, with lot numbers, stage labels, and street names baked in
 * for at-a-glance clarity (matches the print/signboard export). Use PlanView
 * for the interactive lot picker.
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

      {/* Road reserves (faint) */}
      <g stroke="#E5E1D8" strokeWidth="0.4">
        {POLYGONS.roadReserves.map((seg, i) => (
          <line
            key={`rr-${i}`}
            x1={seg[0][0]}
            y1={seg[0][1]}
            x2={seg[1][0]}
            y2={seg[1][1]}
          />
        ))}
      </g>

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

      {/* Lot numbers — hidden on phones where the hero is too small to read
          them (they'd be noise); shown from md up where the map is wide
          enough. The interactive plan below carries them at every size. */}
      {finalLotPolys.map(([id, pts]) => {
        const lot = lotById.get(id);
        if (!lot || !lot.stage) return null;
        const c = centroid(pts);
        return (
          <text
            key={`num-${id}`}
            className="hidden md:block"
            x={c.x}
            y={c.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="5"
            fontWeight="700"
            fill="#1A2744"
            fontFamily="Archivo, sans-serif"
            style={HALO}
          >
            {lot.lotNumber}
          </text>
        );
      })}

      {/* Heritage lots + numbers */}
      {Object.entries(POLYGONS.heritageLots).map(([id, pts]) => {
        const lot = lotById.get(id);
        const c = centroid(pts);
        return (
          <g key={`heritage-${id}`}>
            <path
              d={pointsToD(pts)}
              fill="url(#heroHeritageHatch)"
              stroke="#8B6F1E"
              strokeWidth="0.6"
              strokeDasharray="2 1.5"
            />
            {lot && (
              <text
                className="hidden md:block"
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="5"
                fontWeight="700"
                fill="#5E4A0E"
                fontFamily="Archivo, sans-serif"
                style={HALO}
              >
                {lot.lotNumber}
              </text>
            )}
          </g>
        );
      })}

      {/* Stage labels at the data-defined anchors (anchors are % of viewBox) */}
      {STAGES.map((st) => {
        const a = STAGE_ANCHORS[st];
        if (!a) return null;
        const x = (a.x / 100) * POLYGONS.viewWidth;
        const y = (a.y / 100) * POLYGONS.viewHeight;
        const info = STAGE_INFO[st];
        const label = `STAGE ${st}`;
        const w = label.length * 5.4 + 8;
        return (
          <g key={`stage-${st}`}>
            <rect
              x={x - w / 2}
              y={y - 7.5}
              width={w}
              height={15}
              rx={2.5}
              fill="#FFFFFF"
              stroke={info.border}
              strokeWidth={1}
              opacity={0.92}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="8.5"
              fontWeight="800"
              letterSpacing="0.4"
              fill={info.border}
              fontFamily="Archivo, sans-serif"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Street name labels (clamped to stay inside the viewBox, matching
          PlanView so boundary roads like Sutcliffe don't clip). */}
      {POLYGONS.streetLabels.map((s, i) => {
        const FONT = 6;
        const isRotated = Math.abs(s.rotation || 0) >= 45;
        const halfW = isRotated
          ? FONT * 0.6
          : (s.text.length * (FONT * 0.6 + 1)) / 2;
        const margin = 3;
        const x = Math.min(
          Math.max(s.x, halfW + margin),
          POLYGONS.viewWidth - halfW - margin,
        );
        return (
          <text
            key={`street-${i}`}
            x={x}
            y={s.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={FONT}
            fontWeight="700"
            fill="#1A2744"
            fontFamily="Archivo, sans-serif"
            letterSpacing="0.8"
            transform={s.rotation ? `rotate(${-s.rotation} ${x} ${s.y})` : undefined}
            style={HALO}
          >
            {s.text}
          </text>
        );
      })}
    </svg>
  );
}
