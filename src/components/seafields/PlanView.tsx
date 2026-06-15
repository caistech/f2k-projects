"use client";

import {
  TransformWrapper,
  TransformComponent,
} from "react-zoom-pan-pinch";
import {
  LOTS,
  STAGE_INFO,
  type LotData,
  type LotStage,
} from "@/data/seafields";
import type { PublicLotRow } from "@/app/api/seafields/allocations/route";
import polygonsData from "@/data/seafields/polygons.json";

interface PlanViewProps {
  selectedLots: string[];
  counts: Record<string, number>;
  publicLots: Record<number, PublicLotRow>;
  hoveredLot: string | null;
  setHoveredLot: (id: string | null) => void;
  onOpenLot: (id: string) => void;
  statusFor: (
    count: number,
    isSelected: boolean,
    row: PublicLotRow | undefined,
  ) => { bg: string; border: string };
  byStage: Map<string, LotData[]>;
  /** When non-null, lots in this stage keep their stage colour even when
   * reserved/coming-soon, and lots in other stages are dimmed. Lets Uwe
   * "click a stage and see its colour come back". */
  stageHighlight: Exclude<LotStage, null> | null;
  /** Lots that fail the buyer's active filter set. Dimmed (not hidden)
   * so estate context stays visible. Selected lots remain at full
   * opacity even when filtered out. */
  dimmedLotIds?: Set<string>;
}

function isReservedStatus(status: string | undefined | null): boolean {
  return status === "reserved" || status === "sold" || status === "withheld";
}

type Polygons = {
  viewBox: string;
  viewWidth: number;
  viewHeight: number;
  unitsPerMetre?: number;
  setbackMetres?: number;
  subjectAreaMeters?: { width: number; height: number };
  subjectArea: number[][] | null;
  parentLots: number[][][];
  pos: number[][] | null;
  lots: Record<string, number[][]>;
  heritageLots: Record<string, number[][]>;
  amendments: Record<string, number[][]>;
  buildableEnvelopes: Record<string, { points: number[][]; areaM2: number }>;
  roads: number[][][];
  roadReserves: number[][][];
  streetLabels: { text: string; x: number; y: number; rotation: number }[];
};

const POLYGONS = polygonsData as Polygons;

function pointsToD(pts: number[][]): string {
  if (pts.length === 0) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + " Z";
}

function centroid(pts: number[][]): { x: number; y: number } {
  const x = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const y = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return { x, y };
}

export default function PlanView({
  selectedLots,
  counts,
  publicLots,
  hoveredLot,
  setHoveredLot,
  onOpenLot,
  stageHighlight,
  dimmedLotIds,
}: PlanViewProps) {
  const lotById = new Map<string, LotData>();
  for (const l of LOTS) lotById.set(l.id, l);

  // For lots with amendments, prefer the amended polygon geometry
  const finalLotPolys: Record<string, number[][]> = {};
  for (const [id, pts] of Object.entries(POLYGONS.lots)) {
    finalLotPolys[id] = POLYGONS.amendments[id] || pts;
  }

  return (
    <div className="relative w-full bg-[#FAF8F4] border border-black/10 overflow-hidden">
      <TransformWrapper
        minScale={1}
        maxScale={8}
        initialScale={1}
        centerOnInit
        doubleClick={{ mode: "zoomIn", step: 0.7 }}
        wheel={{ disabled: true }}
        pinch={{ step: 5 }}
        panning={{ velocityDisabled: true }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom controls — the 145-lot map renders each lot well under 44px,
                so on a phone lots are un-tappable without zoom (Mobile Marcus
                2026-06-15). Pinch-to-zoom also works on touch; double-tap zooms. */}
            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => zoomIn()}
                aria-label="Zoom in"
                className="h-11 w-11 flex items-center justify-center rounded bg-white/90 border border-black/10 shadow-sm text-deep-blue text-xl font-bold hover:bg-white"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => zoomOut()}
                aria-label="Zoom out"
                className="h-11 w-11 flex items-center justify-center rounded bg-white/90 border border-black/10 shadow-sm text-deep-blue text-xl font-bold hover:bg-white"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => resetTransform()}
                aria-label="Reset zoom"
                className="h-11 w-11 flex items-center justify-center rounded bg-white/90 border border-black/10 shadow-sm text-deep-blue text-base hover:bg-white"
              >
                ⤢
              </button>
            </div>
            <TransformComponent wrapperClass="!w-full" contentClass="!w-full">
      <svg
        viewBox={POLYGONS.viewBox}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto block"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern
            id="heritageHatch"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <rect width="6" height="6" fill="#F5E7D6" />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke="#C7A877"
              strokeWidth="1.5"
            />
          </pattern>
          <pattern
            id="reservedHatch"
            patternUnits="userSpaceOnUse"
            width="5"
            height="5"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="5"
              stroke="#475569"
              strokeWidth="1"
              opacity="0.55"
            />
          </pattern>
          <pattern
            id="comingSoonHatch"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke="#888"
              strokeWidth="0.8"
              opacity="0.4"
            />
          </pattern>
        </defs>

        {/* Parent lot context outlines */}
        {POLYGONS.parentLots.map((pts, i) => (
          <path
            key={`parent-${i}`}
            d={pointsToD(pts)}
            fill="#F0EDE6"
            stroke="#D4CCB8"
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />
        ))}

        {/* Subject area background */}
        {POLYGONS.subjectArea && (
          <path
            d={pointsToD(POLYGONS.subjectArea)}
            fill="#FFFFFF"
            stroke="#1A2744"
            strokeWidth="1.2"
          />
        )}

        {/* Public Open Space */}
        {POLYGONS.pos && (
          <g>
            <path
              d={pointsToD(POLYGONS.pos)}
              fill="#B8D99B"
              stroke="#6B9B4A"
              strokeWidth="0.8"
            />
            {(() => {
              const c = centroid(POLYGONS.pos!);
              return (
                <text
                  x={c.x}
                  y={c.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill="#3C5C2A"
                  fontFamily="Archivo, sans-serif"
                >
                  Public Open Space
                </text>
              );
            })()}
          </g>
        )}

        {/* Road reserves (light) */}
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

        {/* Road carriageways */}
        <g stroke="#B8B0A0" strokeWidth="0.6">
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

        {/* Lot polygons */}
        {Object.entries(finalLotPolys).map(([id, pts]) => {
          const lot = lotById.get(id);
          if (!lot) return null;
          const stage = lot.stage as Exclude<LotStage, null>;
          const stageInfo = stage ? STAGE_INFO[stage] : null;
          const count = counts[id] || 0;
          const row = publicLots[lot.lotNumber];
          const isSelected = selectedLots.includes(id);
          const isHovered = hoveredLot === id;
          const isReserved = !!row && isReservedStatus(row.status);
          const isComingSoon =
            !!row && !row.is_open_for_registration && !isReserved;

          // Default fill is the single "Available" teal. The stage colour only
          // appears when a stage is explicitly highlighted (the "click a stage"
          // feature) — an available lot no longer takes on its stage colour by
          // default, and interest is shown as a count badge rather than by
          // recolouring the lot (Uwe 2026-06-15).
          let fill = "rgba(0, 181, 173, 0.82)";
          let stroke = "#009E97";
          let strokeWidth = 0.4;
          let opacity = 1;

          // When a stage is highlighted (Uwe's "click a stage to see its
          // colour come back"), lots in that stage keep their stage colour
          // even if reserved/coming-soon; lots in other stages are dimmed.
          const isInHighlightedStage =
            stageHighlight !== null && stage === stageHighlight;
          const isOutsideHighlightedStage =
            stageHighlight !== null && stage !== stageHighlight;

          if (isSelected) {
            fill = "rgba(26, 39, 68, 0.92)";
            stroke = "#FFFFFF";
            strokeWidth = 1.2;
          } else if (isInHighlightedStage) {
            // Keep stage colour regardless of allocation status.
            fill = stageInfo?.color || "#E8E2D4";
            stroke = stageInfo?.border || "#999";
            strokeWidth = 0.6;
          } else if (isReserved) {
            fill = "rgba(100, 116, 139, 0.85)";
            stroke = "#475569";
            strokeWidth = 0.5;
          } else if (isComingSoon) {
            fill = "rgba(180, 180, 180, 0.45)";
            stroke = "#999999";
            strokeWidth = 0.4;
          }

          if (isOutsideHighlightedStage && !isSelected) {
            opacity = 0.25;
          }
          if (dimmedLotIds && dimmedLotIds.has(id) && !isSelected) {
            opacity = 0.18;
          }

          if (isHovered) {
            stroke = "#1A2744";
            strokeWidth = 1.2;
          }

          const c = centroid(pts);
          const ariaLabel = isReserved
            ? `Reserved — Lot ${lot.lotNumber} (${lot.area} sqm)`
            : isComingSoon
              ? `Coming soon — Lot ${lot.lotNumber} (${lot.area} sqm, Stage ${row?.stage_number ?? "?"})`
              : `Lot ${lot.lotNumber} — ${lot.area} sqm${
                  count > 0 ? ` · ${count} interested` : " · available"
                }`;

          return (
            <g
              key={id}
              role="button"
              aria-label={ariaLabel}
              tabIndex={0}
              onClick={() => onOpenLot(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenLot(id);
                }
              }}
              onMouseEnter={() => setHoveredLot(id)}
              onMouseLeave={() => setHoveredLot(null)}
              style={{ cursor: "pointer", outline: "none" }}
            >
              <path
                d={pointsToD(pts)}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
              {/* Diagonal hatch overlay marks reserved/coming-soon lots
                  when their stage is highlighted so the allocation status
                  is still visible behind the restored stage colour. */}
              {isInHighlightedStage && (isReserved || isComingSoon) && (
                <path
                  d={pointsToD(pts)}
                  fill={
                    isReserved ? "url(#reservedHatch)" : "url(#comingSoonHatch)"
                  }
                  stroke="none"
                  pointerEvents="none"
                />
              )}
              <text
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="5.2"
                fontWeight="700"
                fill={isSelected ? "#FFFFFF" : "#1A2744"}
                fontFamily="Archivo, sans-serif"
                pointerEvents="none"
              >
                {lot.lotNumber}
              </text>
              {/* Interest badge — number of registrations of interest, shown as a
                  small badge rather than recolouring the lot (Uwe 2026-06-15). */}
              {count > 0 && !isReserved && !isComingSoon && !isSelected && (
                <g pointerEvents="none">
                  <circle
                    cx={c.x + 4.4}
                    cy={c.y - 4.4}
                    r={3.1}
                    fill="#E8A537"
                    stroke="#FFFFFF"
                    strokeWidth={0.4}
                  />
                  <text
                    x={c.x + 4.4}
                    y={c.y - 4.4}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="3.6"
                    fontWeight="700"
                    fill="#FFFFFF"
                    fontFamily="Archivo, sans-serif"
                  >
                    {count}
                  </text>
                </g>
              )}
              {/* Buildable envelope — dashed inner outline shown on selected lots */}
              {isSelected && POLYGONS.buildableEnvelopes[id] && (
                <path
                  d={pointsToD(POLYGONS.buildableEnvelopes[id].points)}
                  fill="none"
                  stroke="#00B5AD"
                  strokeWidth="0.6"
                  strokeDasharray="2 1.2"
                  pointerEvents="none"
                  opacity="0.95"
                />
              )}
            </g>
          );
        })}

        {/* Heritage retention lots — non-selectable, hatched */}
        {Object.entries(POLYGONS.heritageLots).map(([id, pts]) => {
          const lot = lotById.get(id);
          if (!lot) return null;
          const c = centroid(pts);
          return (
            <g key={`heritage-${id}`} aria-label={`Heritage retention — Lot ${lot.lotNumber}`}>
              <path
                d={pointsToD(pts)}
                fill="url(#heritageHatch)"
                stroke="#8B6F1E"
                strokeWidth="0.8"
                strokeDasharray="2 1.5"
              />
              <text
                x={c.x}
                y={c.y - 4}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="5.2"
                fontWeight="700"
                fill="#5E4A0E"
                fontFamily="Archivo, sans-serif"
                pointerEvents="none"
              >
                {lot.lotNumber}
              </text>
              <text
                x={c.x}
                y={c.y + 4}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="3.2"
                fontWeight="600"
                fill="#5E4A0E"
                fontFamily="Archivo, sans-serif"
                pointerEvents="none"
                letterSpacing="0.5"
              >
                HERITAGE
              </text>
            </g>
          );
        })}

        {/* Street name labels. The label x/y from the DWG is the text CENTRE
            (insert + width/2). Boundary roads (e.g. Sutcliffe, on the east
            edge) can still centre beyond the viewBox, so clamp x so the
            text box stays inside — prevents the "vid Road" clipping the
            Ray White agent reported (2026-05-26). */}
        {POLYGONS.streetLabels.map((s, i) => {
          const FONT = 6.5;
          // Horizontal half-extent for the edge clamp. For rotated (vertical)
          // labels the on-screen width is ~one line height, NOT the text
          // length — so they can sit right at the estate boundary (David Road
          // left margin, Sutcliffe Road North right margin) without being
          // shoved inward over the lots.
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
              letterSpacing="1"
              pointerEvents="none"
              transform={s.rotation ? `rotate(${-s.rotation} ${x} ${s.y})` : undefined}
              style={{ textShadow: "0 0 2px rgba(255,255,255,0.9)" }}
            >
              {s.text}
            </text>
          );
        })}
      </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Caption */}
      <div className="absolute bottom-2 right-3 text-xs font-archivo text-slate/60 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded">
        CLE 3027-08B · 22 April 2026 · Subject area {POLYGONS.subjectAreaMeters?.width || ""}×{POLYGONS.subjectAreaMeters?.height || ""}m
      </div>
    </div>
  );
}
