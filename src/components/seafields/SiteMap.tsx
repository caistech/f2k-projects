"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
import {
  LOTS,
  CATEGORY_INFO,
  STAGE_INFO,
  type LotData,
  type LotStage,
} from "@/data/seafields";
import type { PublicLotRow } from "@/app/api/seafields/allocations/route";
import LotBadge from "./LotBadge";
import LotInfoCard from "./LotInfoCard";
import PlanView from "./PlanView";

// Lazy-load Mapbox satellite component — defers loading mapbox-gl (~200KB
// gzipped) and react-map-gl until a buyer activates the satellite tab.
const SatelliteSitePlan = dynamic(() => import("./SatelliteSitePlan"), {
  ssr: false,
  loading: () => (
    <div className="bg-[#0F1419] text-white/60 font-archivo text-sm flex items-center justify-center" style={{ height: 600 }}>
      Loading satellite imagery…
    </div>
  ),
});

type StageFilter = "all" | Exclude<LotStage, null>;
type ViewMode = "schematic" | "plan" | "satellite" | "drawing";

interface SiteMapProps {
  selectedLots: string[];
  onToggleLot: (lotId: string) => void;
}

function isReservedStatus(status: string | undefined | null): boolean {
  return status === "reserved" || status === "sold" || status === "withheld";
}

function isOpenForPublic(row: PublicLotRow | undefined): boolean {
  if (!row) return false;
  return (
    row.allocation_bucket === "public" &&
    row.is_open_for_registration &&
    row.status === "available"
  );
}

// Spatial arrangement of stages on the schematic — rows of stage panels,
// roughly matching CLE Plan 3027-08-01 layout.
const STAGE_ROWS: LotStage[][] = [
  ["7"],            // top: Collins Road
  ["6", "5"],       // upper: central + east
  ["3", "4"],       // middle: central + POS-adjacent
  ["2", "1"],       // bottom: Pepper Gate West + GROH/WACHS block
];

const STATUS_COLORS = {
  available: { bg: "rgba(0, 181, 173, 0.85)", border: "#009E97" },
  one:       { bg: "rgba(232, 165, 55, 0.88)", border: "#CC8A1E" },
  two:       { bg: "rgba(200, 169, 81, 0.88)", border: "#B8941A" },
  three:     { bg: "rgba(232, 93, 74, 0.88)",  border: "#C0392B" },
  reserved:  { bg: "rgba(100, 116, 139, 0.92)", border: "#475569" }, // slate
  comingSoon:{ bg: "rgba(180, 180, 180, 0.55)", border: "#999999" }, // future stage
  selected:  { bg: "rgba(26, 39, 68, 0.95)",   border: "#FFFFFF" },
};

function statusFor(
  count: number,
  isSelected: boolean,
  row: PublicLotRow | undefined,
) {
  if (isSelected) return STATUS_COLORS.selected;
  if (row && isReservedStatus(row.status)) return STATUS_COLORS.reserved;
  if (row && !row.is_open_for_registration) return STATUS_COLORS.comingSoon;
  if (count >= 3) return STATUS_COLORS.three;
  if (count === 2) return STATUS_COLORS.two;
  if (count === 1) return STATUS_COLORS.one;
  return STATUS_COLORS.available;
}

export default function SiteMap({ selectedLots, onToggleLot }: SiteMapProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [publicLots, setPublicLots] = useState<Record<number, PublicLotRow>>({});
  const [loaded, setLoaded] = useState(false);
  const [hoveredLot, setHoveredLot] = useState<string | null>(null);
  const [openLotId, setOpenLotId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("plan");

  useEffect(() => {
    (async () => {
      try {
        const [countsRes, lotsRes] = await Promise.all([
          fetch("/api/seafields/lots"),
          fetch("/api/seafields/allocations"),
        ]);
        if (countsRes.ok) {
          const d = await countsRes.json();
          setCounts(d.counts || {});
        }
        if (lotsRes.ok) {
          const d = (await lotsRes.json()) as { lots?: PublicLotRow[] };
          const byNum: Record<number, PublicLotRow> = {};
          for (const a of d.lots || []) byNum[a.lot_number] = a;
          setPublicLots(byNum);
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Group lots by stage
  const byStage = useMemo(() => {
    const m = new Map<string, LotData[]>();
    for (const l of LOTS) {
      if (!l.stage) continue;
      if (!m.has(l.stage)) m.set(l.stage, []);
      m.get(l.stage)!.push(l);
    }
    for (const [, arr] of m) arr.sort((a, b) => a.lotNumber - b.lotNumber);
    return m;
  }, []);

  const hoveredData = hoveredLot ? LOTS.find((l) => l.id === hoveredLot) : null;
  const hoveredRow = hoveredData
    ? publicLots[hoveredData.lotNumber]
    : undefined;

  const totalLots = LOTS.length;
  const reservedCount = Object.values(publicLots).filter((r) =>
    isReservedStatus(r.status),
  ).length;

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm font-archivo items-center">
        <span className="text-slate font-semibold text-xs uppercase tracking-wider">
          Status:
        </span>
        {[
          { k: "available", label: "Available" },
          { k: "one", label: "1 interested" },
          { k: "two", label: "2 interested" },
          { k: "three", label: "3+ interested" },
          { k: "reserved", label: "Reserved" },
          { k: "comingSoon", label: "Coming soon" },
          { k: "selected", label: "Your selection" },
        ].map((item) => {
          const c = STATUS_COLORS[item.k as keyof typeof STATUS_COLORS];
          return (
            <div key={item.k} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-sm border-2"
                style={{ backgroundColor: c.bg, borderColor: c.border }}
              />
              <span className="text-slate text-xs">{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Stage legend */}
      <div className="flex flex-wrap gap-3 mb-6 text-xs font-archivo items-center">
        <span className="text-slate font-semibold text-xs uppercase tracking-wider">
          Stages:
        </span>
        {(["1", "2", "3", "4", "5", "6", "7"] as const).map((s) => {
          const info = STAGE_INFO[s];
          const count = byStage.get(s)?.length || 0;
          return (
            <div
              key={s}
              className="flex items-center gap-1.5 border rounded px-2 py-0.5"
              style={{ backgroundColor: info.color, borderColor: info.border }}
            >
              <span className="font-bold">{info.label}</span>
              <span className="text-slate/70">({count})</span>
            </div>
          );
        })}
        <div className="ml-auto text-xs text-slate/60">
          {totalLots} lots · {reservedCount} reserved
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center gap-2 mb-3">
        <span className="font-archivo text-xs text-slate font-semibold uppercase tracking-wider">
          View:
        </span>
        <div className="inline-flex border-2 border-deep-blue/20 rounded-sm overflow-hidden">
          {(["plan", "satellite", "schematic", "drawing"] as const).map((mode) => {
            const isActive = viewMode === mode;
            const label =
              mode === "schematic"
                ? "Schematic grid"
                : mode === "plan"
                  ? "Plan view"
                  : mode === "satellite"
                    ? "Satellite"
                    : "Official drawing";
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`font-archivo text-xs px-3 py-1.5 transition-colors ${
                  isActive
                    ? "bg-deep-blue text-white"
                    : "bg-white text-slate hover:bg-deep-blue/5"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {viewMode === "plan" && (
          <span className="font-archivo text-xs text-slate/60 ml-2">
            Vector site plan from CLE 08B
          </span>
        )}
        {viewMode === "satellite" && (
          <span className="font-archivo text-xs text-slate/60 ml-2">
            Satellite imagery via Mapbox · click a lot to select
          </span>
        )}
        {viewMode === "drawing" && (
          <span className="font-archivo text-xs text-slate/60 ml-2">
            CLE DA plan 3027-08B-01 · authoritative lot shapes
          </span>
        )}
      </div>

      {/* Stage filter tabs — schematic view only */}
      <div
        className="flex flex-wrap gap-1.5 mb-4"
        style={{ display: viewMode === "schematic" ? undefined : "none" }}
      >
        {(["all", "1", "2", "3", "4", "5", "6", "7"] as const).map((key) => {
          const isActive = stageFilter === key;
          const label =
            key === "all" ? "All stages" : STAGE_INFO[key].label;
          const count =
            key === "all"
              ? totalLots
              : byStage.get(key)?.length || 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStageFilter(key)}
              className={`font-archivo text-xs px-3 py-1.5 border-2 transition-colors ${
                isActive
                  ? "bg-deep-blue text-white border-deep-blue"
                  : "bg-white text-slate border-black/10 hover:border-deep-blue/50"
              }`}
            >
              <span className="font-semibold">{label}</span>
              <span
                className={`ml-1.5 ${
                  isActive ? "text-white/70" : "text-slate/50"
                }`}
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Plan view — vector SVG polygons from CLE 08B DWG */}
      {viewMode === "plan" && (
        <div style={{ opacity: loaded ? 1 : 0.55 }}>
          <PlanView
            selectedLots={selectedLots}
            counts={counts}
            publicLots={publicLots}
            hoveredLot={hoveredLot}
            setHoveredLot={setHoveredLot}
            onOpenLot={(id) => setOpenLotId(id)}
            statusFor={statusFor}
            byStage={byStage}
          />
        </div>
      )}

      {/* Official drawing — high-res raster of the CLE DA plan, non-interactive */}
      {viewMode === "drawing" && (
        <div className="bg-white border border-black/10 p-3">
          <a
            href="/seafields/site-plan-hires.jpg"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open the official Seafields DA plan in a new tab"
          >
            <img
              src="/seafields/site-plan-hires.jpg"
              alt="Seafields CLE DA plan 3027-08B-01 — official subdivision drawing"
              className="w-full h-auto"
              loading="lazy"
            />
          </a>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-archivo text-slate/70">
            <span>
              Source: CLE Town Planning &amp; Design — Plan 3027-08B-01
              (WAPC-approved subdivision)
            </span>
            <a
              href="/seafields/3027-08B-01-DA-plan.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00B5AD] hover:underline font-semibold"
            >
              Download official PDF →
            </a>
          </div>
          <p className="mt-2 text-xs text-slate/50 font-archivo italic">
            This is the authoritative engineering drawing. Lot shapes here
            override any approximations in the schematic, plan, or satellite
            views. To select a lot, switch back to Plan view or Schematic grid.
          </p>
        </div>
      )}

      {/* Satellite view — Mapbox tiles + GeoJSON polygon overlay */}
      {viewMode === "satellite" && (
        <div style={{ opacity: loaded ? 1 : 0.55 }}>
          <SatelliteSitePlan
            selectedLots={selectedLots}
            counts={counts}
            publicLots={publicLots}
            hoveredLot={hoveredLot}
            setHoveredLot={setHoveredLot}
            onOpenLot={(id) => setOpenLotId(id)}
          />
        </div>
      )}

      {/* Schematic stage grid */}
      <div
        className="space-y-4"
        style={{
          opacity: loaded ? 1 : 0.55,
          display: viewMode === "schematic" ? undefined : "none",
        }}
      >
        {STAGE_ROWS.map((row, ri) => {
          const visibleStages = row.filter(
            (s) => stageFilter === "all" || stageFilter === s,
          );
          if (visibleStages.length === 0) return null;
          return (
            <div key={ri} className="flex flex-col md:flex-row gap-4">
              {visibleStages.map((stageKey) => {
                const info = STAGE_INFO[stageKey!];
                const lots = byStage.get(stageKey!) || [];
                if (lots.length === 0) return null;
                const widthClass =
                  visibleStages.length === 1 ? "w-full" : "flex-1";
                return (
                  <section
                    key={stageKey}
                    className={`${widthClass} rounded-md border-2 p-3`}
                    style={{
                      backgroundColor: info.color,
                      borderColor: info.border,
                    }}
                  >
                    <header className="flex items-center justify-between mb-2">
                      <h3
                        className="font-playfair font-black text-lg"
                        style={{ color: info.border }}
                      >
                        {info.title}
                      </h3>
                      <span className="font-archivo text-xs text-slate/70">
                        {lots.length} lot{lots.length === 1 ? "" : "s"}
                      </span>
                    </header>
                    <div
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(72px, 1fr))",
                      }}
                    >
                      {lots.map((lot) => {
                        const count = counts[lot.id] || 0;
                        const row = publicLots[lot.lotNumber];
                        const isAllocated = !!row && isReservedStatus(row.status);
                        const isSelected = selectedLots.includes(lot.id);
                        const isHovered = hoveredLot === lot.id;
                        const { bg, border } = statusFor(count, isSelected, row);
                        const isComingSoon = !!row && !row.is_open_for_registration && !isAllocated;
                        const ariaLabel = isAllocated
                          ? `Reserved — Lot ${lot.lotNumber} (${lot.area} sqm)`
                          : isComingSoon
                            ? `Coming soon — Lot ${lot.lotNumber} (${lot.area} sqm, Stage ${row?.stage_number ?? "?"})`
                            : `Lot ${lot.lotNumber} — ${lot.area} sqm${
                                count > 0
                                  ? ` · ${count} interested`
                                  : " · available"
                              }`;
                        return (
                          <LotBadge
                            key={lot.id}
                            lotNumber={lot.lotNumber}
                            area={lot.area}
                            bg={bg}
                            border={border}
                            isSelected={isSelected}
                            isHovered={isHovered}
                            isAllocated={isAllocated || isComingSoon}
                            registrationCount={count}
                            onClick={() => setOpenLotId(lot.id)}
                            onMouseEnter={() => setHoveredLot(lot.id)}
                            onMouseLeave={() => setHoveredLot(null)}
                            ariaLabel={ariaLabel}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Click-to-open info card */}
      {openLotId &&
        (() => {
          const lot = LOTS.find((l) => l.id === openLotId);
          if (!lot) return null;
          const count = counts[lot.id] || 0;
          const row = publicLots[lot.lotNumber];
          const isSelected = selectedLots.includes(lot.id);
          const { bg, border } = statusFor(count, isSelected, row);
          return (
            <LotInfoCard
              lot={lot}
              registrationCount={count}
              publicRow={row}
              canSelect={isOpenForPublic(row) || isSelected}
              isSelected={isSelected}
              bg={bg}
              border={border}
              onClose={() => setOpenLotId(null)}
              onToggle={() => onToggleLot(lot.id)}
            />
          );
        })()}

      {/* Hover tooltip */}
      {hoveredData && (
        <div className="mt-4 text-center font-archivo text-sm text-slate bg-white border border-black/5 py-3 px-4">
          <strong className="text-deep-blue">Lot {hoveredData.lotNumber}</strong>
          {" - "}
          {hoveredData.area} sqm {" | "} {CATEGORY_INFO[hoveredData.category].label}
          {hoveredData.stage
            ? ` | ${STAGE_INFO[hoveredData.stage].title}`
            : ""}
          {hoveredRow && isReservedStatus(hoveredRow.status) ? (
            <>
              {" | "}
              <span
                className="font-semibold"
                style={{ color: STATUS_COLORS.reserved.border }}
              >
                Reserved
              </span>
            </>
          ) : hoveredRow && !hoveredRow.is_open_for_registration ? (
            <>
              {" | "}
              <span
                className="font-semibold"
                style={{ color: STATUS_COLORS.comingSoon.border }}
              >
                Coming soon
              </span>
            </>
          ) : (
            <>
              {" | "}
              <span className="font-semibold">
                {counts[hoveredData.id] || 0}{" "}
                {(counts[hoveredData.id] || 0) === 1
                  ? "person interested"
                  : "interested"}
              </span>
              {hoveredRow?.total_price ? (
                <span className="text-slate/60 ml-3">
                  ${Math.round(hoveredRow.total_price).toLocaleString()}
                </span>
              ) : hoveredRow?.land_total ? (
                <span className="text-slate/60 ml-3">
                  ${Math.round(hoveredRow.land_total).toLocaleString()} (land)
                </span>
              ) : null}
            </>
          )}
        </div>
      )}

      <p className="text-xs text-slate/50 font-archivo mt-3 text-center">
        Click any lot to view its details and add it to your registration.
        Lots marked <strong>Reserved</strong> are not available for
        registration.
      </p>
    </div>
  );
}
