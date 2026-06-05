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

type PurchaseFilter = "any" | "land" | "hl";
type SizeFilter = "any" | "s" | "m" | "l";
type PriceFilter = "any" | "p1" | "p2" | "p3";

/** Public-facing land-price for a lot. Prefers H&L total when the lot is
 * an H&L package, falls back to bare land. Returns null when undisclosed
 * (e.g. display_price_to_public=false in admin). */
function publicPriceOf(row: PublicLotRow | undefined): number | null {
  if (!row) return null;
  return row.total_price ?? row.land_total ?? null;
}

function matchesSize(area: number, f: SizeFilter): boolean {
  switch (f) {
    case "s":
      return area <= 500;
    case "m":
      return area > 500 && area <= 700;
    case "l":
      return area > 700;
    default:
      return true;
  }
}

function matchesPrice(price: number | null, f: PriceFilter): boolean {
  if (f === "any") return true;
  if (price == null) return false; // unknown price excluded by an explicit price band
  switch (f) {
    case "p1":
      return price <= 300_000;
    case "p2":
      return price > 300_000 && price <= 400_000;
    case "p3":
      return price > 400_000;
    default:
      return true;
  }
}

function matchesPurchase(
  row: PublicLotRow | undefined,
  f: PurchaseFilter,
): boolean {
  if (f === "any") return true;
  if (!row) return false;
  if (f === "land") return row.land_only === true;
  if (f === "hl") return row.land_only === false;
  return true;
}

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
  const [filterPurchase, setFilterPurchase] = useState<PurchaseFilter>("any");
  const [filterSize, setFilterSize] = useState<SizeFilter>("any");
  const [filterPrice, setFilterPrice] = useState<PriceFilter>("any");
  const [availableOnly, setAvailableOnly] = useState<boolean>(true);

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

  // Lots that do NOT match the active public filters. Dimmed (not hidden)
  // on the map so buyers still see estate context — they can tell roughly
  // how many lots are filtered out vs available.
  const dimmedLotIds = useMemo(() => {
    const dimmed = new Set<string>();
    const filtersActive =
      filterPurchase !== "any" ||
      filterSize !== "any" ||
      filterPrice !== "any" ||
      availableOnly;
    if (!filtersActive) return dimmed;
    for (const lot of LOTS) {
      const row = publicLots[lot.lotNumber];
      const isAvailable =
        !!row && row.is_open_for_registration && !isReservedStatus(row.status);
      if (availableOnly && !isAvailable) {
        dimmed.add(lot.id);
        continue;
      }
      if (!matchesPurchase(row, filterPurchase)) {
        dimmed.add(lot.id);
        continue;
      }
      if (!matchesSize(lot.area, filterSize)) {
        dimmed.add(lot.id);
        continue;
      }
      if (!matchesPrice(publicPriceOf(row), filterPrice)) {
        dimmed.add(lot.id);
        continue;
      }
    }
    return dimmed;
  }, [publicLots, filterPurchase, filterSize, filterPrice, availableOnly]);

  const matchingCount = LOTS.length - dimmedLotIds.size;

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
          { k: "available", label: "Available · no registrations" },
          { k: "one", label: "Available · 1 registered" },
          { k: "two", label: "Available · 2 registered" },
          { k: "three", label: "Available · 3+ registered" },
          { k: "reserved", label: "Reserved (off market)" },
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

      {/* F2KSFLDS-27: explain why an available lot can change colour — the
          warm colours are interest heat, not a different availability state. */}
      <p className="-mt-2 mb-4 text-[11px] text-slate/70 font-archivo max-w-prose">
        Teal lots are open with no registrations yet. Warmer colours
        (amber&nbsp;→&nbsp;red) show how many buyers have registered interest —
        those lots are still available to register on until one is formally
        reserved, when it turns slate and leaves the market.
      </p>

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

      {/* Buyer filters — narrow the map to lots that match the buyer's
          decision criteria. Dim (not hide) non-matches so estate context
          stays visible. Applies to plan / schematic / satellite. */}
      <div className="bg-white border border-black/10 p-3 mb-4">
        <div className="flex flex-wrap gap-x-5 gap-y-3 items-center text-xs font-archivo">
          <div>
            <span className="block text-slate font-semibold uppercase tracking-wider text-[0.6rem] mb-1">
              Purchase type
            </span>
            <select
              value={filterPurchase}
              onChange={(e) =>
                setFilterPurchase(e.target.value as PurchaseFilter)
              }
              className="border border-black/10 px-2 py-1.5 text-deep-blue bg-white focus:outline-none focus:border-[#00B5AD]"
            >
              <option value="any">Any</option>
              <option value="land">Vacant land</option>
              <option value="hl">House &amp; land</option>
            </select>
          </div>
          <div>
            <span className="block text-slate font-semibold uppercase tracking-wider text-[0.6rem] mb-1">
              Land size
            </span>
            <select
              value={filterSize}
              onChange={(e) => setFilterSize(e.target.value as SizeFilter)}
              className="border border-black/10 px-2 py-1.5 text-deep-blue bg-white focus:outline-none focus:border-[#00B5AD]"
            >
              <option value="any">Any size</option>
              <option value="s">Small — up to 500m²</option>
              <option value="m">Medium — 500–700m²</option>
              <option value="l">Large — over 700m²</option>
            </select>
          </div>
          <div>
            <span className="block text-slate font-semibold uppercase tracking-wider text-[0.6rem] mb-1">
              Price
            </span>
            <select
              value={filterPrice}
              onChange={(e) => setFilterPrice(e.target.value as PriceFilter)}
              className="border border-black/10 px-2 py-1.5 text-deep-blue bg-white focus:outline-none focus:border-[#00B5AD]"
            >
              <option value="any">Any price</option>
              <option value="p1">Up to $300k</option>
              <option value="p2">$300k – $400k</option>
              <option value="p3">$400k+</option>
            </select>
            <span className="block text-slate/50 text-[0.6rem] italic mt-0.5">
              Only lots with disclosed pricing match.
            </span>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer pt-4">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="w-4 h-4 accent-[#00B5AD]"
            />
            <span className="text-deep-blue font-semibold">
              Available only
            </span>
          </label>
          {(filterPurchase !== "any" ||
            filterSize !== "any" ||
            filterPrice !== "any" ||
            !availableOnly) && (
            <button
              type="button"
              onClick={() => {
                setFilterPurchase("any");
                setFilterSize("any");
                setFilterPrice("any");
                setAvailableOnly(true);
              }}
              className="text-[#00B5AD] hover:underline pt-4"
            >
              Reset filters
            </button>
          )}
          <div className="ml-auto text-slate/60 pt-4">
            {dimmedLotIds.size > 0 ? (
              <span>
                <strong className="text-deep-blue">{matchingCount}</strong>{" "}
                lots match — {dimmedLotIds.size} dimmed
              </span>
            ) : (
              <span>
                Showing all <strong className="text-deep-blue">{LOTS.length}</strong>{" "}
                lots
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stage filter tabs — schematic + plan views.
          Plan view uses it to highlight a stage's lots in stage colour
          (incl. allocated/coming-soon), per Uwe 2026-05-21 feedback. */}
      <div
        className="flex flex-wrap gap-1.5 mb-4"
        style={{
          display:
            viewMode === "schematic" || viewMode === "plan"
              ? undefined
              : "none",
        }}
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
            stageHighlight={
              stageFilter === "all"
                ? null
                : (stageFilter as Exclude<LotStage, null>)
            }
            dimmedLotIds={dimmedLotIds}
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
            dimmedLotIds={dimmedLotIds}
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
                            isDimmed={dimmedLotIds.has(lot.id)}
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
