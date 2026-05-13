"use client";

import { useEffect, useMemo, useState } from "react";
import { LOTS, STAGE_INFO } from "@/data/seafields";

interface Allocation {
  lot_number: number;
  sqm: number;
  allocated_to: string | null;
  dwelling_type: string | null;
  stage: string | null;
  notes: string | null;
  wholesale_price: number | null;
  retail_price: number | null;
  intent_locked_to_registration_id: string | null;
}

const STAGE_ORDER = ["1", "2", "3", "4", "5", "6", "7"] as const;

function fmtAUD(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function SeafieldsPipelinePage() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [interestCounts, setInterestCounts] = useState<Record<string, number>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [allocRes, countsRes] = await Promise.all([
          fetch("/api/admin/seafields/allocations"),
          fetch("/api/admin/seafields/lots"),
        ]);
        if (!allocRes.ok) {
          setError("Failed to load allocations");
        } else {
          const data = await allocRes.json();
          setAllocations(data.allocations || []);
        }
        if (countsRes.ok) {
          const data = await countsRes.json();
          setInterestCounts(data.counts || {});
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allocByNumber = useMemo(() => {
    const m: Record<number, Allocation> = {};
    for (const a of allocations) m[a.lot_number] = a;
    return m;
  }, [allocations]);

  // Per-lot view enriched with shared register data + interest count
  const enriched = useMemo(() => {
    return LOTS.map((lot) => {
      const alloc = allocByNumber[lot.lotNumber];
      const interest = interestCounts[lot.id] || 0;
      const status: "allocated" | "soft" | "interest" | "available" = lot.isHeritage
        ? "allocated"
        : alloc?.allocated_to
          ? "allocated"
          : alloc?.intent_locked_to_registration_id
            ? "soft"
            : interest > 0
              ? "interest"
              : "available";
      return {
        lot,
        alloc,
        interest,
        status,
      };
    });
  }, [allocByNumber, interestCounts]);

  // Top-line totals
  const totals = useMemo(() => {
    const totalLots = enriched.length;
    const allocated = enriched.filter((e) => e.status === "allocated").length;
    const soft = enriched.filter((e) => e.status === "soft").length;
    const withInterest = enriched.filter((e) => e.interest > 0).length;
    const available =
      totalLots - allocated - soft - 0; // available even if has interest
    const totalRegistrations = Object.values(interestCounts).reduce(
      (s, n) => s + n,
      0,
    );
    const oversubscriptionRatio =
      totalLots > 0 ? totalRegistrations / totalLots : 0;
    return {
      totalLots,
      allocated,
      soft,
      withInterest,
      available,
      totalRegistrations,
      oversubscriptionRatio,
    };
  }, [enriched, interestCounts]);

  // Per-stage breakdown
  const stageBreakdown = useMemo(() => {
    return STAGE_ORDER.map((s) => {
      const inStage = enriched.filter((e) => e.lot.stage === s);
      const lots = inStage.length;
      const allocated = inStage.filter((e) => e.status === "allocated").length;
      const soft = inStage.filter((e) => e.status === "soft").length;
      const interest = inStage.reduce((sum, e) => sum + e.interest, 0);
      const ratio = lots > 0 ? interest / lots : 0;
      return {
        stage: s,
        info: STAGE_INFO[s],
        lots,
        allocated,
        soft,
        interest,
        ratio,
      };
    });
  }, [enriched]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">
        Seafields Pipeline
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Demand snapshot for the 145-lot subdivision. For funder reporting and
        commercial planning. Numbers reflect waitlist registrations + admin
        allocations as of now.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Top-line metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <Metric label="Total lots" value={totals.totalLots} />
        <Metric
          label="Allocated"
          value={totals.allocated}
          tint="purple"
        />
        <Metric label="Soft-allocated" value={totals.soft} tint="amber" />
        <Metric
          label="Lots with interest"
          value={totals.withInterest}
          tint="sky"
        />
        <Metric
          label="Total registrations"
          value={totals.totalRegistrations}
          tint="emerald"
        />
        <Metric
          label="Interest / lot"
          value={`${totals.oversubscriptionRatio.toFixed(2)}×`}
          tint="emerald"
          subtitle={
            totals.oversubscriptionRatio >= 1
              ? "oversubscribed"
              : "below par"
          }
        />
      </div>

      {/* Per-stage breakdown */}
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        By stage
      </h3>
      <div className="bg-white border rounded mb-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-3 py-2 text-left">Stage</th>
              <th className="px-3 py-2 text-right">Lots</th>
              <th className="px-3 py-2 text-right">Allocated</th>
              <th className="px-3 py-2 text-right">Soft</th>
              <th className="px-3 py-2 text-right">Interest</th>
              <th className="px-3 py-2 text-right">Ratio</th>
              <th className="px-3 py-2 text-left">Saturation</th>
            </tr>
          </thead>
          <tbody>
            {stageBreakdown.map((s) => {
              const oversub = s.ratio >= 1;
              const barWidth = Math.min(100, s.ratio * 50); // 1.0 ratio = 50% bar; 2.0 = 100%
              return (
                <tr key={s.stage} className="border-t hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <span
                      className="inline-block px-2 py-0.5 rounded border text-xs font-semibold mr-2"
                      style={{
                        backgroundColor: s.info.color,
                        borderColor: s.info.border,
                      }}
                    >
                      {s.info.label}
                    </span>
                    <span className="text-slate-600 text-xs">
                      {s.info.title.split("—")[1]?.trim()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {s.lots}
                  </td>
                  <td className="px-3 py-2 text-right text-purple-700">
                    {s.allocated || "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-amber-600">
                    {s.soft || "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-sky-700 font-semibold">
                    {s.interest}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-bold ${
                      oversub ? "text-emerald-700" : "text-slate-500"
                    }`}
                  >
                    {s.ratio.toFixed(2)}×
                  </td>
                  <td className="px-3 py-2">
                    <div className="bg-slate-100 rounded-full h-2 w-32 overflow-hidden">
                      <div
                        className={
                          oversub ? "bg-emerald-500 h-2" : "bg-sky-400 h-2"
                        }
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Per-lot table */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-slate-900">
          By lot — full register
        </h3>
        <span className="text-xs text-slate-500">
          Sorted by interest count, descending
        </span>
      </div>
      <div className="bg-white border rounded overflow-x-auto">
        {loading ? (
          <div className="p-6 text-slate-500">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Lot</th>
                <th className="px-3 py-2 text-right">Sqm</th>
                <th className="px-3 py-2 text-left">Stage</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Allocated to</th>
                <th className="px-3 py-2 text-right">Interest</th>
                <th className="px-3 py-2 text-right">Wholesale</th>
                <th className="px-3 py-2 text-right">Retail</th>
              </tr>
            </thead>
            <tbody>
              {enriched
                .slice()
                .sort((a, b) => {
                  if (b.interest !== a.interest) return b.interest - a.interest;
                  return a.lot.lotNumber - b.lot.lotNumber;
                })
                .map(({ lot, alloc, interest, status }) => (
                  <tr key={lot.id} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-2 font-semibold">
                      {lot.lotNumber}
                      {lot.id !== `L${lot.lotNumber}` && (
                        <span className="text-slate-400 text-xs ml-0.5">
                          {lot.id.replace(`L${lot.lotNumber}`, "")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{lot.area}</td>
                    <td className="px-3 py-2">
                      {lot.stage ? (
                        <span
                          className="inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold"
                          style={{
                            backgroundColor: STAGE_INFO[lot.stage].color,
                            borderColor: STAGE_INFO[lot.stage].border,
                          }}
                        >
                          S{lot.stage}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {status === "allocated" && (
                        <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[11px] font-medium">
                          {lot.isHeritage ? "Heritage" : "Allocated"}
                        </span>
                      )}
                      {status === "soft" && (
                        <span className="inline-block bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[11px] font-medium">
                          Soft
                        </span>
                      )}
                      {status === "interest" && (
                        <span className="inline-block bg-sky-100 text-sky-800 px-2 py-0.5 rounded text-[11px] font-medium">
                          Interest
                        </span>
                      )}
                      {status === "available" && (
                        <span className="text-slate-400 text-[11px]">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {alloc?.allocated_to || (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {interest > 0 ? (
                        <span className="font-semibold text-sky-700">
                          {interest}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {fmtAUD(alloc?.wholesale_price)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {fmtAUD(alloc?.retail_price)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tint,
  subtitle,
}: {
  label: string;
  value: string | number;
  tint?: "purple" | "amber" | "sky" | "emerald";
  subtitle?: string;
}) {
  const colour = {
    purple: "text-purple-700",
    amber: "text-amber-600",
    sky: "text-sky-700",
    emerald: "text-emerald-700",
  }[tint ?? ("none" as never)];
  return (
    <div className="bg-white border rounded p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className={`text-2xl font-bold ${
          colour || "text-slate-900"
        } leading-tight mt-0.5`}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-[10px] text-slate-500 mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}
